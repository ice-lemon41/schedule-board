import { buildBuckets, INBOX_KEY } from './buckets'
import type { ScheduleItem } from './types'

export interface MoveResult {
  /** 更新后的全量条目(未变化的条目保持原引用) */
  items: ScheduleItem[]
  /** position 或 date 发生变化的条目(用于增量持久化) */
  changed: ScheduleItem[]
}

/**
 * 把 id 指定的条目移动到 targetKey 桶(待安排或某一天)的 targetIndex 位置,并对目标桶重排编号。
 * 同桶移动等价于 reorder;跨桶移动会更新条目的 date。
 * 窗口外的日期不可作为 targetKey(看板上不存在该列,调用方保证)。
 */
export function moveItem(
  items: readonly ScheduleItem[],
  id: string,
  targetKey: string,
  targetIndex: number,
  windowDays: readonly string[],
  now = Date.now(),
): MoveResult {
  const moving = items.find((item) => item.id === id)
  if (!moving) return { items: [...items], changed: [] }

  const date = targetKey === INBOX_KEY ? null : targetKey
  const target = buildBuckets(
    items.filter((item) => item.id !== id),
    windowDays,
  ).find((bucket) => bucket.key === targetKey)
  if (!target) return { items: [...items], changed: [] }

  const index = Math.max(0, Math.min(targetIndex, target.items.length))
  const updated: ScheduleItem = { ...moving, date, position: index, updatedAt: now }
  const reordered = [...target.items.slice(0, index), updated, ...target.items.slice(index)]

  // 落回原位(同桶、顺序不变、日期不变)→ 无任何变化,避免无意义的写入
  const before = buildBuckets(items, windowDays).find((bucket) => bucket.key === targetKey)
  const sameOrder =
    before !== undefined &&
    moving.date === date &&
    before.items.map((item) => item.id).join() === reordered.map((item) => item.id).join()
  if (sameOrder) return { items: [...items], changed: [] }

  const changedById = new Map<string, ScheduleItem>()
  reordered.forEach((item, position) => {
    if (item.id === id) {
      changedById.set(id, updated)
    } else if (item.position !== position) {
      changedById.set(item.id, { ...item, position, updatedAt: now })
    }
  })

  const finalItems = items.map((item) => changedById.get(item.id) ?? item)
  return { items: finalItems, changed: [...changedById.values()] }
}
