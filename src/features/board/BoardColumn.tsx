import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { CSSProperties } from 'react'
import { INBOX_KEY, type BoardBucket } from '../../core/buckets'
import { isToday } from '../../core/dateUtils'
import { ItemCard } from './ItemCard'

interface Props {
  bucket: BoardBucket
  /** 中心圆(待安排桶)样式 */
  center?: boolean
  /** 环上位置(天面板);center 时不传 */
  style?: CSSProperties
  focused: boolean
  onFocus: (key: string) => void
  onToggleDone: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function BoardColumn({ bucket, center = false, style, focused, onFocus, onToggleDone, onEdit, onDelete }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: bucket.key, data: { isColumn: true } })
  const today = bucket.key !== INBOX_KEY && isToday(bucket.key)

  return (
    <section
      className={`column${center ? ' column--center' : ''}${focused ? ' column--focused' : ''}${isOver ? ' column--over' : ''}`}
      style={style}
    >
      <button type="button" className="column__header" aria-pressed={focused} onClick={() => onFocus(bucket.key)}>
        <span className="column__label">
          {bucket.label}
          {today && <span className="column__today">今天</span>}
        </span>
        <span className="column__count">{bucket.items.length}</span>
      </button>
      <SortableContext items={bucket.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="column__body" ref={setNodeRef}>
          {bucket.items.map((item) => (
            <ItemCard key={item.id} item={item} onToggleDone={onToggleDone} onEdit={onEdit} onDelete={onDelete} />
          ))}
          {bucket.items.length === 0 && <p className="column__empty">把卡片拖到这里</p>}
        </div>
      </SortableContext>
    </section>
  )
}
