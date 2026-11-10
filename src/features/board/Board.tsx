import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { CSSProperties } from 'react'
import { INBOX_KEY, type BoardBucket } from '../../core/buckets'
import { resolveDropTarget } from './dropTarget'
import { BoardColumn } from './BoardColumn'

interface Props {
  buckets: BoardBucket[]
  focusKey: string
  onFocus: (key: string) => void
  onToggleDone: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onMoveTo: (id: string, targetKey: string, targetIndex: number) => void
}

/** 7 天在环上的位置(容器百分比):窗口首日=今天在正上方,顺时针排列 */
const RING_RADIUS = 42 // 锚点到中心的距离(%)
const DAY_POSITIONS: CSSProperties[] = Array.from({ length: 7 }, (_, i) => {
  const theta = (i / 7) * 2 * Math.PI
  return {
    '--x': `${(50 + RING_RADIUS * Math.sin(theta)).toFixed(2)}%`,
    '--y': `${(50 - RING_RADIUS * Math.cos(theta)).toFixed(2)}%`,
  } as CSSProperties
})

export function Board({ buckets, focusKey, onFocus, onToggleDone, onEdit, onDelete, onMoveTo }: Props) {
  // 位移 6px 才触发拖拽:普通点击仍然可以打开编辑
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const bucketLength = (key: string) => buckets.find((b) => b.key === key)?.items.length ?? 0

  const onDragEnd = (event: DragEndEvent) => {
    const target = resolveDropTarget(event.over, bucketLength)
    if (!target) return
    onMoveTo(String(event.active.id), target.key, target.index)
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="radial">
        {buckets.map((bucket, index) => {
          const isCenter = bucket.key === INBOX_KEY
          // buckets 固定为 [待安排, ...7天];天面板取环上位置,待安排居中
          const style = isCenter ? undefined : DAY_POSITIONS[index - 1]
          return (
            <BoardColumn
              key={bucket.key}
              bucket={bucket}
              center={isCenter}
              style={style}
              focused={bucket.key === focusKey}
              onFocus={onFocus}
              onToggleDone={onToggleDone}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )
        })}
      </div>
    </DndContext>
  )
}
