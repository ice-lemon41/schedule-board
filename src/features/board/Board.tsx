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

/** 环半径(容器百分比):内环写时间轴标签,外环挂事项面板 */
const LABEL_RADIUS = 22
const PANEL_RADIUS = 38

/** 窗口第 index 天在环上的位置:今天(首日)在正上方,顺时针排列 */
function ringPosition(index: number, radius: number): CSSProperties {
  const theta = (index / 7) * 2 * Math.PI
  return {
    '--x': `${(50 + radius * Math.sin(theta)).toFixed(2)}%`,
    '--y': `${(50 - radius * Math.cos(theta)).toFixed(2)}%`,
  } as CSSProperties
}

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

  const inbox = buckets.find((b) => b.key === INBOX_KEY)
  const days = buckets.filter((b) => b.key !== INBOX_KEY)

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="radial">
        {inbox && (
          <BoardColumn
            key={inbox.key}
            bucket={inbox}
            variant="inbox"
            focused={inbox.key === focusKey}
            onFocus={onFocus}
            onToggleDone={onToggleDone}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
        {days.map((bucket, index) => (
          <BoardColumn
            key={bucket.key}
            bucket={bucket}
            variant="day"
            labelStyle={ringPosition(index, LABEL_RADIUS)}
            panelStyle={ringPosition(index, PANEL_RADIUS)}
            focused={bucket.key === focusKey}
            onFocus={onFocus}
            onToggleDone={onToggleDone}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </DndContext>
  )
}
