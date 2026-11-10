import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { CSSProperties } from 'react'
import type { BoardBucket } from '../../core/buckets'
import { isToday } from '../../core/dateUtils'
import { ItemCard } from './ItemCard'

interface Props {
  bucket: BoardBucket
  variant: 'inbox' | 'day'
  /** 时间轴标签在环上的位置(day) */
  labelStyle?: CSSProperties
  /** 事项面板在环外圈的位置(day) */
  panelStyle?: CSSProperties
  focused: boolean
  onFocus: (key: string) => void
  onToggleDone: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function BoardColumn({
  bucket,
  variant,
  labelStyle,
  panelStyle,
  focused,
  onFocus,
  onToggleDone,
  onEdit,
  onDelete,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: bucket.key, data: { isColumn: true } })
  const today = variant === 'day' && isToday(bucket.key)

  const cards = (
    <>
      {bucket.items.map((item) => (
        <ItemCard key={item.id} item={item} onToggleDone={onToggleDone} onEdit={onEdit} onDelete={onDelete} />
      ))}
      {bucket.items.length === 0 && <p className="bucket__empty">把卡片拖到这里</p>}
    </>
  )

  if (variant === 'inbox') {
    return (
      <section className={`inbox${focused ? ' inbox--focused' : ''}${isOver ? ' inbox--over' : ''}`}>
        <button type="button" className="inbox__header" aria-pressed={focused} onClick={() => onFocus(bucket.key)}>
          <span className="inbox__title">{bucket.label}</span>
          <span className="bucket__count">{bucket.items.length}</span>
        </button>
        <SortableContext items={bucket.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <div className="inbox__body" ref={setNodeRef}>
            {cards}
          </div>
        </SortableContext>
      </section>
    )
  }

  return (
    <div className="radial__day">
      <button
        type="button"
        className={`ring__label${today ? ' ring__label--today' : ''}${focused ? ' ring__label--focused' : ''}`}
        style={labelStyle}
        aria-pressed={focused}
        onClick={() => onFocus(bucket.key)}
      >
        <span className="ring__text">{bucket.label}</span>
        {today && <span className="ring__badge">今天</span>}
        <span className="bucket__count">{bucket.items.length}</span>
      </button>
      <section
        className={`day-panel${focused ? ' day-panel--focused' : ''}${isOver ? ' day-panel--over' : ''}`}
        style={panelStyle}
        aria-label={bucket.label}
      >
        <SortableContext items={bucket.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <div className="day-panel__body" ref={setNodeRef}>
            {cards}
          </div>
        </SortableContext>
      </section>
    </div>
  )
}
