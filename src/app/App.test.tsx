import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { addDays, dateLabel, todayStr, weekdayLabel, weekdayOf } from '../core/dateUtils'
import { createItem } from '../core/entity'
import type { ScheduleItem } from '../core/types'
import type { ScheduleRepository } from '../data/repository'
import { App } from './App'

/**
 * 说明:真实拖拽手势由 dnd-kit 负责,这里不模拟;
 * 拖拽的落点计算与移动持久化已由 dropTarget.test / useScheduleBoard.test 覆盖。
 * 本文件覆盖用户可见行为:渲染、录入、完成、编辑、删除、翻周、刷新保持。
 */

function makeFakeRepo(seed: ScheduleItem[] = []): ScheduleRepository & { store: Map<string, ScheduleItem> } {
  const store = new Map(seed.map((i) => [i.id, i]))
  return {
    store,
    async listAll() {
      return [...store.values()].filter((i) => i.deletedAt === null)
    },
    async put(item) {
      store.set(item.id, item)
    },
    async putMany(items) {
      items.forEach((i) => store.set(i.id, i))
    },
  }
}

const today = todayStr()
const tomorrow = addDays(today, 1)
const day3 = addDays(today, 2)
const tomorrowLabel = `${dateLabel(tomorrow)} ${weekdayLabel(tomorrow)}`
const day3Label = `${dateLabel(day3)} ${weekdayLabel(day3)}`

function columnOf(text: string): Element {
  const el = screen.getByText(text).closest('.column')
  expect(el).not.toBeNull()
  return el!
}

/** 解析预览行(dnd-kit 的 DndLiveRegion 同为 role="status",故用类名精确定位) */
function preview(): Element {
  const el = document.querySelector('.quickadd__preview')
  expect(el).not.toBeNull()
  return el!
}

describe('App 看板', () => {
  it('空库打开:待安排 + 从今天起 7 天,今天列有徽标', async () => {
    render(<App repository={makeFakeRepo()} />)
    await screen.findByText('待安排')
    const headers = document.querySelectorAll('.column__header')
    expect(headers).toHaveLength(8)
    expect(headers[1].textContent).toContain(`${dateLabel(today)} ${weekdayLabel(today)}`)
    expect(headers[1].textContent).toContain('今天')
    expect(headers[7].textContent).toContain(dateLabel(addDays(today, 6)))
  })

  it('快速录入:无日期 → 待安排;预览正确', async () => {
    const user = userEvent.setup()
    render(<App repository={makeFakeRepo()} />)

    const input = screen.getByLabelText('快速录入')
    await user.type(input, '交周报')
    expect(preview()).toHaveTextContent('将安排到:待安排')

    fireEvent.click(screen.getByRole('button', { name: '添加' }))
    await screen.findByText('交周报')
    expect(columnOf('交周报').textContent).toContain('待安排')
  })

  it('快速录入:「明天 交周报」落在明天列', async () => {
    const user = userEvent.setup()
    render(<App repository={makeFakeRepo()} />)

    await user.type(screen.getByLabelText('快速录入'), '明天 交周报')
    expect(preview()).toHaveTextContent(tomorrowLabel)

    fireEvent.click(screen.getByRole('button', { name: '添加' }))
    await screen.findByText('交周报')
    expect(columnOf('交周报').textContent).toContain(tomorrowLabel)
  })

  it('快速录入:「周五 交周报」落在周五列(验收标准)', async () => {
    const user = userEvent.setup()
    render(<App repository={makeFakeRepo()} />)

    // 本周五(已过则下周)——与 quickAdd 解析规则一致
    const friday = addDays(today, (5 - weekdayOf(today) + 7) % 7)
    const fridayLabel = `${dateLabel(friday)} ${weekdayLabel(friday)}`

    await user.type(screen.getByLabelText('快速录入'), '周五 交周报')
    expect(preview()).toHaveTextContent(fridayLabel)

    fireEvent.click(screen.getByRole('button', { name: '添加' }))
    await screen.findByText('交周报')
    expect(columnOf('交周报').textContent).toContain(fridayLabel)
  })

  it('点击列标题聚焦后,无日期录入落到该列', async () => {
    const user = userEvent.setup()
    render(<App repository={makeFakeRepo()} />)
    await screen.findByText('待安排')

    const headers = document.querySelectorAll('.column__header')
    fireEvent.click(headers[2]) // 明天列
    // focused 类挂在列容器(.column)上,而非表头按钮
    expect(headers[2].closest('.column')).toHaveClass('column--focused')

    await user.type(screen.getByLabelText('快速录入'), '吃饭')
    expect(preview()).toHaveTextContent(tomorrowLabel)
    fireEvent.click(screen.getByRole('button', { name: '添加' }))

    await screen.findByText('吃饭')
    expect(columnOf('吃饭').textContent).toContain(tomorrowLabel)
  })

  it('径向布局:待安排在中心圆,7 天面板带环上定位,今天在正上方', async () => {
    render(<App repository={makeFakeRepo()} />)
    await screen.findByText('待安排')

    const center = document.querySelector('.column--center')
    expect(center).not.toBeNull()
    expect(center!.textContent).toContain('待安排')

    const days = document.querySelectorAll('.column:not(.column--center)')
    expect(days).toHaveLength(7)
    expect(days[0].querySelector('.column__header')!.textContent).toContain(`${dateLabel(today)} ${weekdayLabel(today)}`)
    for (const el of days) {
      const style = el.getAttribute('style') ?? ''
      expect(style).toContain('--x')
      expect(style).toContain('--y')
    }
    // 窗口首日(今天)锚点在正上方:x=50%,y 最小
    expect(days[0].getAttribute('style')).toContain('--x: 50.00%')
    const yValues = [...days].map((el) => Number((el.getAttribute('style') ?? '').match(/--y: ([\d.]+)%/)?.[1]))
    expect(yValues[0]).toBeLessThan(Math.min(...yValues.slice(1)))
  })

  it('刷新(重新挂载)后数据保持', async () => {
    const user = userEvent.setup()
    const repo = makeFakeRepo()
    const first = render(<App repository={repo} />)
    await user.type(screen.getByLabelText('快速录入'), '明天 交周报')
    fireEvent.click(screen.getByRole('button', { name: '添加' }))
    await screen.findByText('交周报')
    await waitFor(() => expect(repo.store.size).toBe(1))
    first.unmount()

    render(<App repository={repo} />)
    await screen.findByText('交周报')
    expect(columnOf('交周报').textContent).toContain(tomorrowLabel)
  })

  it('勾选完成与取消勾选', async () => {
    const repo = makeFakeRepo([createItem({ title: '任务甲', date: null }, 0)])
    render(<App repository={repo} />)
    const box = await screen.findByRole('checkbox', { name: '完成 任务甲' })
    expect(box).not.toBeChecked()

    fireEvent.click(box)
    await waitFor(() => expect(repo.store.values().next().value!.done).toBe(true))
    expect(screen.getByRole('checkbox', { name: '完成 任务甲' })).toBeChecked()
  })

  it('编辑对话框:改标题与日期,卡片移动到新列', async () => {
    const repo = makeFakeRepo([createItem({ title: '交周报', date: tomorrow }, 0)])
    render(<App repository={repo} />)
    await screen.findByText('交周报')

    fireEvent.click(screen.getByText('交周报'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '交月报' } })
    fireEvent.change(screen.getByLabelText('日期'), { target: { value: day3 } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await screen.findByText('交月报')
    expect(columnOf('交月报').textContent).toContain(day3Label)
    await waitFor(() => expect(repo.store.values().next().value!.title).toBe('交月报'))
  })

  it('删除卡片(软删除)', async () => {
    const repo = makeFakeRepo([createItem({ title: '临时事', date: null }, 0)])
    render(<App repository={repo} />)
    await screen.findByText('临时事')

    fireEvent.click(screen.getByRole('button', { name: '删除 临时事' }))
    await waitFor(() => expect(screen.queryByText('临时事')).toBeNull())
    const stored = repo.store.values().next().value!
    expect(stored.deletedAt).not.toBeNull() // 软删除而非物理删除
  })

  it('翻周与回到今天', async () => {
    render(<App repository={makeFakeRepo()} />)
    await screen.findByText('待安排')
    const headers = () => document.querySelectorAll('.column__header')

    fireEvent.click(screen.getByRole('button', { name: '下一周 →' }))
    expect(headers()[1].textContent).toContain(dateLabel(addDays(today, 7)))

    fireEvent.click(screen.getByRole('button', { name: '← 上一周' }))
    expect(headers()[1].textContent).toContain(dateLabel(today))

    fireEvent.click(screen.getByRole('button', { name: '下一周 →' }))
    fireEvent.click(screen.getByRole('button', { name: '回到今天' }))
    expect(headers()[1].textContent).toContain(dateLabel(today))
  })
})
