/**
 * 解析 dnd-kit 拖拽结束时的落点:目标桶与目标下标。
 * 与 dnd-kit 的事件结构解耦(结构化子集),便于单测。
 */
export interface DropTarget {
  /** 'inbox' 或 'YYYY-MM-DD' */
  key: string
  index: number
}

export interface OverLike {
  id: string | number
  data?: {
    current?: { sortable?: { containerId: string | number; index: number }; [key: string]: unknown }
  }
}

/**
 * over 为卡片(可排序项)→ 落到它所在的位置;
 * over 为列(空列或列背景)→ 落到该列末尾。
 */
export function resolveDropTarget(
  over: OverLike | null | undefined,
  getBucketLength: (key: string) => number,
): DropTarget | null {
  if (!over) return null
  const sortable = over.data?.current?.sortable
  if (sortable) {
    return { key: String(sortable.containerId), index: sortable.index }
  }
  const key = String(over.id)
  return { key, index: getBucketLength(key) }
}
