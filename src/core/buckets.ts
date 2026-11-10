import type { ScheduleItem } from './types'
import { dateLabel, weekdayLabel } from './dateUtils'

export const INBOX_KEY = 'inbox'
export const INBOX_LABEL = '待安排'

export interface BoardBucket {
  /** 'inbox' 或 'YYYY-MM-DD' */
  key: string
  label: string
  items: ScheduleItem[]
}

/** 桶内排序:position 优先,相同时按 createdAt 保持稳定 */
function compareItems(a: ScheduleItem, b: ScheduleItem): number {
  if (a.position !== b.position) return a.position - b.position
  return a.createdAt - b.createdAt
}

/**
 * 把条目分桶到看板窗口的 7 天 + 「待安排」桶。
 * - 软删除(deletedAt 非空)的条目被过滤;
 * - date 为 null → 待安排桶;
 * - date 在窗口外 → 不显示(条目仍保留在数据库中)。
 * 「列」永远由 date 推导,不落库(见 docs/mvp-spec.md §3)。
 */
export function buildBuckets(items: readonly ScheduleItem[], windowDays: readonly string[]): BoardBucket[] {
  const byKey = new Map<string, ScheduleItem[]>()
  byKey.set(INBOX_KEY, [])
  for (const day of windowDays) byKey.set(day, [])

  for (const item of items) {
    if (item.deletedAt !== null) continue
    if (item.date === null) {
      byKey.get(INBOX_KEY)!.push(item)
    } else if (byKey.has(item.date)) {
      byKey.get(item.date)!.push(item)
    }
  }

  const buckets: BoardBucket[] = [
    { key: INBOX_KEY, label: INBOX_LABEL, items: byKey.get(INBOX_KEY)! },
  ]
  for (const day of windowDays) {
    buckets.push({ key: day, label: `${dateLabel(day)} ${weekdayLabel(day)}`, items: byKey.get(day)! })
  }
  for (const bucket of buckets) bucket.items.sort(compareItems)
  return buckets
}
