import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { BoardBucket } from '../../core/buckets'
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
      <div className="board">
        {buckets.map((bucket) => (
          <BoardColumn
            key={bucket.key}
            bucket={bucket}
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
