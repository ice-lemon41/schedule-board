import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildBuckets, INBOX_KEY, type BoardBucket } from '../../core/buckets'
import { boardWindow, parseDateStr, todayStr } from '../../core/dateUtils'
import { createItem, withUpdates } from '../../core/entity'
import { moveItem } from '../../core/move'
import { nextPosition } from '../../core/position'
import type { QuickAddResult } from '../../core/quickAdd'
import type { ScheduleItem } from '../../core/types'
import type { ScheduleRepository } from '../../data/repository'

/**
 * 看板状态管理:加载、增删改、完成、拖拽移动、翻周。
 * 所有写操作先更新本地状态(乐观),再异步持久化到 Repository。
 */
export function useScheduleBoard(repo: ScheduleRepository) {
  const [items, setItems] = useState<ScheduleItem[]>([])
  const [weekOffset, setWeekOffset] = useState(0)

  const windowDays = useMemo(() => boardWindow(new Date(), weekOffset), [weekOffset])
  const buckets = useMemo(() => buildBuckets(items, windowDays), [items, windowDays])

  useEffect(() => {
    let alive = true
    repo.listAll().then((loaded) => {
      if (alive) setItems(loaded)
    })
    return () => {
      alive = false
    }
  }, [repo])

  const persist = useCallback(
    (op: Promise<unknown>) => {
      op.catch((err) => console.error('持久化失败:', err))
    },
    [],
  )

  /** 新建;目标桶 = 解析出的日期 ?? 聚焦列。窗口外日期自动跳周,避免"输入后消失" */
  const createFromQuickAdd = useCallback(
    (parsed: QuickAddResult, fallbackKey: string) => {
      const key = parsed.date ?? fallbackKey
      const date = key === INBOX_KEY ? null : key
      if (parsed.date && !windowDays.includes(parsed.date)) {
        const today = parseDateStr(todayStr())
        const target = parseDateStr(parsed.date)
        const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000)
        setWeekOffset(Math.floor(diffDays / 7))
      }
      const bucket = buckets.find((b) => b.key === key)
      const item = createItem(
        { title: parsed.title, date, startAt: parsed.startAt, endAt: parsed.endAt },
        nextPosition(bucket?.items ?? []),
      )
      setItems((prev) => [...prev, item])
      persist(repo.put(item))
    },
    [buckets, windowDays, repo, persist],
  )

  const toggleDone = useCallback(
    (id: string) => {
      const target = items.find((i) => i.id === id)
      if (!target) return
      const next = withUpdates(target, { done: !target.done })
      setItems((prev) => prev.map((i) => (i.id === id ? next : i)))
      persist(repo.put(next))
    },
    [items, repo, persist],
  )

  const updateItem = useCallback(
    (id: string, patch: Partial<ScheduleItem>) => {
      const target = items.find((i) => i.id === id)
      if (!target) return
      const merged = withUpdates(target, patch)
      const isAllDay = !merged.startAt
      const next = { ...merged, isAllDay, endAt: isAllDay ? undefined : merged.endAt }
      setItems((prev) => prev.map((i) => (i.id === id ? next : i)))
      persist(repo.put(next))
    },
    [items, repo, persist],
  )

  /** 软删除 */
  const removeItem = useCallback(
    (id: string) => {
      const target = items.find((i) => i.id === id)
      if (!target) return
      setItems((prev) => prev.filter((i) => i.id !== id))
      persist(repo.put(withUpdates(target, { deletedAt: Date.now() })))
    },
    [items, repo, persist],
  )

  const moveTo = useCallback(
    (id: string, targetKey: string, targetIndex: number) => {
      const result = moveItem(items, id, targetKey, targetIndex, windowDays)
      setItems(result.items)
      if (result.changed.length > 0) persist(repo.putMany(result.changed))
    },
    [items, windowDays, repo, persist],
  )

  const goPrevWeek = useCallback(() => setWeekOffset((o) => o - 1), [])
  const goNextWeek = useCallback(() => setWeekOffset((o) => o + 1), [])
  const goToday = useCallback(() => setWeekOffset(0), [])

  return {
    items,
    buckets: buckets as BoardBucket[],
    windowDays,
    weekOffset,
    createFromQuickAdd,
    toggleDone,
    updateItem,
    removeItem,
    moveTo,
    goPrevWeek,
    goNextWeek,
    goToday,
  }
}
