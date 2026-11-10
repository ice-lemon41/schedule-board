import type { ScheduleItem } from './types'

export interface ReorderResult {
  /** 重排后的整个桶(新数组;未发生变化的条目保持原对象引用) */
  items: ScheduleItem[]
  /** position 发生变化的条目(用于增量持久化) */
  changed: ScheduleItem[]
}

/**
 * 把 id 指定的条目移动到桶内 targetIndex,并对整个桶重排编号(position = 0..n-1)。
 * 本地单用户场景下桶内条目量很小,整体重排足够简单可靠(docs/mvp-spec.md §4)。
 */
export function reorder(
  bucket: readonly ScheduleItem[],
  id: string,
  targetIndex: number,
  now = Date.now(),
): ReorderResult {
  const fromIndex = bucket.findIndex((item) => item.id === id)
  if (fromIndex === -1) return { items: [...bucket], changed: [] }

  const clamped = Math.max(0, Math.min(targetIndex, bucket.length - 1))
  const next = [...bucket]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(clamped, 0, moved)

  const changed: ScheduleItem[] = []
  const items = next.map((item, index) => {
    if (item.position === index) return item
    const updated = { ...item, position: index, updatedAt: now }
    changed.push(updated)
    return updated
  })
  return { items, changed }
}

/** 新条目追加到桶末尾时的 position */
export function nextPosition(bucket: readonly ScheduleItem[]): number {
  return bucket.reduce((max, item) => Math.max(max, item.position + 1), 0)
}
