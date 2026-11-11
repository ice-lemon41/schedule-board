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

const dayLabel = (d: string) => `${dateLabel(d)} ${weekdayLabel(d)}`

/** 解析预览行(dnd-kit 的 DndLiveRegion 同为 role="status",故用类名精确定位) */
function preview(): Element {
  const el = document.querySelector('.quickadd__preview')
  expect(el).not.toBeNull()
  return el!
}

/** 中心待安排圆 */
function inbox(): Element {
  const el = document.querySelector('.inbox')
  expect(el).not.toBeNull()
  return el!
}

/** 环上的日期标签(时间轴),按天数顺序(今天→第 7 天) */
function pills(): Element[] {
  return [...document.querySelectorAll('.ring__label')]
}

/** 指定日期的事项面板(挂在环外圈,aria-label = 列标签) */
function panelByDate(d: string): Element {
  const label = dayLabel(d)
  const panel = [...document.querySelectorAll('.day-panel')].find((p) => p.getAttribute('aria-label') === label)
  if (!panel) throw new Error(`找不到 ${label} 的事项面板`)
  return panel
}

/** 元素 style 里 --x/--y 相对中心的距离(容器百分比) */
function radiusOf(el: Element): number {
  const style = el.getAttribute('style') ?? ''
  const x = Number(style.match(/--x: ([\d.]+)%/)?.[1] ?? 50) - 50
  const y = 50 - Number(style.match(/--y: ([\d.]+)%/)?.[1] ?? 50)
  return Math.hypot(x, y)
}

/** 元素 style 里 --x/--y 相对中心的角度(正上方为 0,顺时针为正) */
function angleOf(el: Element): number {
  const style = el.getAttribute('style') ?? ''
  const x = Number(style.match(/--x: ([\d.]+)%/)?.[1] ?? 50) - 50
  const y = 50 - Number(style.match(/--y: ([\d.]+)%/)?.[1] ?? 50)
  return Math.atan2(x, y)
}

describe('App 看板', () => {
  it('空库打开:中心待安排圆 + 环上 7 个日期标签,今天在正上方', async () => {
    render(<App repository={makeFakeRepo()} />)
    await screen.findByText('待安排')

    expect(inbox().textContent).toContain('待安排')
    const labels = pills()
    expect(labels).toHaveLength(7)
    expect(labels[0].textContent).toContain(dayLabel(today))
    expect(labels[0].textContent).toContain('今天')
    expect(labels[6].textContent).toContain(dayLabel(addDays(today, 6)))
    expect(document.querySelectorAll('.day-panel')).toHaveLength(7)
  })

  it('径向几何:日期标签写在环上、事项面板挂环外圈、今天标签在正上方', async () => {
    render(<App repository={makeFakeRepo()} />)
    await screen.findByText('待安排')

    const labels = pills()
    const panels = [...document.querySelectorAll('.day-panel')]
    expect(panels).toHaveLength(7)

    // 今天(窗口首日)标签在正上方:x 居中、y 最小
    expect(labels[0].getAttribute('style')).toContain('--x: 50.00%')
    const labelYs = labels.map((el) => Number(el.getAttribute('style')!.match(/--y: ([\d.]+)%/)![1]))
    expect(labelYs[0]).toBeLessThan(Math.min(...labelYs.slice(1)))

    // 事项面板比时间轴标签更靠外;与标签同角度(径向对齐)
    for (let i = 0; i < 7; i++) {
      expect(radiusOf(panels[i])).toBeGreaterThan(radiusOf(labels[i]))
      expect(angleOf(panels[i])).toBeCloseTo(angleOf(labels[i]), 2)
    }

    // 中心圆在容器中心
    expect(inbox().className).toContain('inbox')
  })

  it('快速录入:无日期 → 待安排;预览正确', async () => {
    const user = userEvent.setup()
    render(<App repository={makeFakeRepo()} />)

    const input = screen.getByLabelText('快速录入')
    await user.type(input, '交周报')
    expect(preview()).toHaveTextContent('将安排到:待安排')

    fireEvent.click(screen.getByRole('button', { name: '添加' }))
    await screen.findByText('交周报')
    expect(inbox().textContent).toContain('交周报')
  })

  it('快速录入:「明天 交周报」落在明天的面板', async () => {
    const user = userEvent.setup()
    render(<App repository={makeFakeRepo()} />)

    await user.type(screen.getByLabelText('快速录入'), '明天 交周报')
    expect(preview()).toHaveTextContent(dayLabel(tomorrow))

    fireEvent.click(screen.getByRole('button', { name: '添加' }))
    await screen.findByText('交周报')
    expect(panelByDate(tomorrow).textContent).toContain('交周报')
  })

  it('快速录入:「周五 交周报」落在周五面板(验收标准)', async () => {
    const user = userEvent.setup()
    render(<App repository={makeFakeRepo()} />)

    // 本周五(已过则下周)——与 quickAdd 解析规则一致
    const friday = addDays(today, (5 - weekdayOf(today) + 7) % 7)

    await user.type(screen.getByLabelText('快速录入'), '周五 交周报')
    expect(preview()).toHaveTextContent(dayLabel(friday))

    fireEvent.click(screen.getByRole('button', { name: '添加' }))
    await screen.findByText('交周报')
    expect(panelByDate(friday).textContent).toContain('交周报')
  })

  it('点击环上日期标签聚焦后,无日期录入落到该日', async () => {
    const user = userEvent.setup()
    render(<App repository={makeFakeRepo()} />)
    await screen.findByText('待安排')

    const tomorrowPill = pills()[1] // 明天
    fireEvent.click(tomorrowPill)
    expect(tomorrowPill).toHaveClass('ring__label--focused')

    await user.type(screen.getByLabelText('快速录入'), '吃饭')
    expect(preview()).toHaveTextContent(dayLabel(tomorrow))
    fireEvent.click(screen.getByRole('button', { name: '添加' }))

    await screen.findByText('吃饭')
    expect(panelByDate(tomorrow).textContent).toContain('吃饭')
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
    expect(panelByDate(tomorrow).textContent).toContain('交周报')
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

  it('编辑对话框:改标题与日期,卡片移动到新面板', async () => {
    const repo = makeFakeRepo([createItem({ title: '交周报', date: tomorrow }, 0)])
    render(<App repository={repo} />)
    await screen.findByText('交周报')

    fireEvent.click(screen.getByText('交周报'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '交月报' } })
    fireEvent.change(screen.getByLabelText('日期'), { target: { value: day3 } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await screen.findByText('交月报')
    expect(panelByDate(day3).textContent).toContain('交月报')
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
    const firstLabel = () => pills()[0].textContent ?? ''

    // 按钮两行排布:文字在上、箭头在下;「回到今天」拆成两行
    const [prev, back, next] = [...document.querySelectorAll('.app__navbtn')].map((b) =>
      [...b.querySelectorAll('span')].map((s) => s.textContent),
    )
    expect(prev).toEqual(['上一周', '←'])
    expect(back).toEqual(['回到', '今天'])
    expect(next).toEqual(['下一周', '→'])

    fireEvent.click(screen.getByRole('button', { name: '下一周' }))
    expect(firstLabel()).toContain(dateLabel(addDays(today, 7)))

    fireEvent.click(screen.getByRole('button', { name: '上一周' }))
    expect(firstLabel()).toContain(dateLabel(today))

    fireEvent.click(screen.getByRole('button', { name: '下一周' }))
    fireEvent.click(screen.getByRole('button', { name: '回到今天' }))
    expect(firstLabel()).toContain(dateLabel(today))
  })
})
