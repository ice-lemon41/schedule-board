import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ScheduleItem } from '../../core/types'

interface Props {
  item: ScheduleItem
  onToggleDone: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function ItemCard({ item, onToggleDone, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`card${item.done ? ' card--done' : ''}${isDragging ? ' card--dragging' : ''}`}
      onClick={() => onEdit(item.id)}
      title="点击编辑,拖动可移动"
      {...attributes}
      {...listeners}
    >
      <input
        type="checkbox"
        className="card__check"
        aria-label={`完成 ${item.title}`}
        checked={item.done}
        onChange={() => onToggleDone(item.id)}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="card__main">
        <span className="card__title">{item.title}</span>
        {!item.isAllDay && (
          <span className="card__time">
            {item.startAt}
            {item.endAt ? `-${item.endAt}` : ''}
          </span>
        )}
        {item.notes && <span className="card__notes" title={item.notes}>📝</span>}
      </div>
      <button
        type="button"
        className="card__delete"
        aria-label={`删除 ${item.title}`}
        onClick={(e) => {
          e.stopPropagation()
          onDelete(item.id)
        }}
      >
        ×
      </button>
    </div>
  )
}
