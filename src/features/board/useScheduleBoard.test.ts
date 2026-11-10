import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { INBOX_KEY } from '../../core/buckets'
import { addDays, todayStr } from '../../core/dateUtils'
import { createItem } from '../../core/entity'
import type { ScheduleItem } from '../../core/types'
import type { ScheduleRepository } from '../../data/repository'
import { useScheduleBoard } from './useScheduleBoard'

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

describe('useScheduleBoard', () => {
  it('挂载时从 Repository 加载', async () => {
    const a = createItem({ title: 'a', date: null }, 0)
    const b = createItem({ title: 'b', date: null }, 1)
    const repo = makeFakeRepo([a, b])
    const { result } = renderHook(() => useScheduleBoard(repo))
    await waitFor(() => expect(result.current.items).toHaveLength(2))
    expect(result.current.buckets[0].items.map((i) => i.title)).toEqual(['a', 'b'])
  })

  it('createFromQuickAdd:无日期 → 落入聚焦列并持久化', async () => {
    const repo = makeFakeRepo()
    const { result } = renderHook(() => useScheduleBoard(repo))
    await waitFor(() => expect(result.current.items).toHaveLength(0))

    act(() => result.current.createFromQuickAdd({ title: '吃饭', date: null, isAllDay: true }, INBOX_KEY))
    await waitFor(() => expect(repo.store.size).toBe(1))
    expect(result.current.items).toHaveLength(1)
    expect(result.current.buckets[0].items.map((i) => i.title)).toEqual(['吃饭'])
  })

  it('createFromQuickAdd:日期在窗口外 → 自动跳周', async () => {
    const repo = makeFakeRepo()
    const { result } = renderHook(() => useScheduleBoard(repo))
    await waitFor(() => expect(result.current.items).toHaveLength(0))

    const far = addDays(todayStr(), 14)
    act(() => result.current.createFromQuickAdd({ title: '远期', date: far, isAllDay: true }, INBOX_KEY))
    await waitFor(() => expect(result.current.windowDays[0]).toBe(far))
    expect(result.current.windowDays).toContain(far)
  })

  it('moveTo:同桶重排并持久化新位置', async () => {
    const a = createItem({ title: '一', date: null }, 0)
    const b = createItem({ title: '二', date: null }, 1)
    const c = createItem({ title: '三', date: null }, 2)
    const repo = makeFakeRepo([a, b, c])
    const { result } = renderHook(() => useScheduleBoard(repo))
    await waitFor(() => expect(result.current.items).toHaveLength(3))

    act(() => result.current.moveTo(c.id, INBOX_KEY, 0))
    expect(result.current.buckets[0].items.map((i) => i.title)).toEqual(['三', '一', '二'])
    await waitFor(() => expect(repo.store.get(c.id)!.position).toBe(0))
  })

  it('toggleDone / removeItem 软删除', async () => {
    const a = createItem({ title: 'a', date: null }, 0)
    const repo = makeFakeRepo([a])
    const { result } = renderHook(() => useScheduleBoard(repo))
    await waitFor(() => expect(result.current.items).toHaveLength(1))

    act(() => result.current.toggleDone(a.id))
    await waitFor(() => expect(repo.store.get(a.id)!.done).toBe(true))
    expect(result.current.items[0].done).toBe(true)

    act(() => result.current.removeItem(a.id))
    await waitFor(() => expect(repo.store.get(a.id)!.deletedAt).not.toBeNull())
    expect(result.current.items).toHaveLength(0)
  })

  it('updateItem:设置时刻 → 非全天;清空时刻 → 全天且清 endAt', async () => {
    const a = createItem({ title: 'a', date: null }, 0)
    const repo = makeFakeRepo([a])
    const { result } = renderHook(() => useScheduleBoard(repo))
    await waitFor(() => expect(result.current.items).toHaveLength(1))

    act(() => result.current.updateItem(a.id, { startAt: '10:00', endAt: '11:00' }))
    await waitFor(() => expect(repo.store.get(a.id)!.isAllDay).toBe(false))
    expect(result.current.items[0].endAt).toBe('11:00')

    act(() => result.current.updateItem(a.id, { startAt: undefined }))
    await waitFor(() => expect(repo.store.get(a.id)!.isAllDay).toBe(true))
    expect(result.current.items[0].endAt).toBeUndefined()
  })

  it('翻周:goNextWeek / goToday', async () => {
    const repo = makeFakeRepo()
    const { result } = renderHook(() => useScheduleBoard(repo))
    await waitFor(() => expect(result.current.items).toHaveLength(0))

    const firstDay = result.current.windowDays[0]
    act(() => result.current.goNextWeek())
    expect(result.current.windowDays[0]).toBe(addDays(firstDay, 7))
    act(() => result.current.goPrevWeek())
    expect(result.current.windowDays[0]).toBe(firstDay)
    act(() => result.current.goNextWeek())
    act(() => result.current.goToday())
    expect(result.current.windowDays[0]).toBe(firstDay)
  })
})
