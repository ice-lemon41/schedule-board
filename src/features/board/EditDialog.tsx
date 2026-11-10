import { useState } from 'react'
import { isValidDateStr } from '../../core/dateUtils'
import { isValidTimeRange } from '../../core/entity'
import type { ScheduleItem } from '../../core/types'

export interface EditPatch {
  title: string
  date: string | null
  startAt?: string
  endAt?: string
  notes?: string
}

interface Props {
  item: ScheduleItem
  onSave: (patch: EditPatch) => void
  onCancel: () => void
  onDelete: () => void
}

export function EditDialog({ item, onSave, onCancel, onDelete }: Props) {
  const [title, setTitle] = useState(item.title)
  const [date, setDate] = useState(item.date ?? '')
  const [startAt, setStartAt] = useState(item.startAt ?? '')
  const [endAt, setEndAt] = useState(item.endAt ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')

  const dateOk = date === '' || isValidDateStr(date)
  const timeOk = isValidTimeRange(startAt || undefined, endAt || undefined)
  const canSave = title.trim() !== '' && dateOk && timeOk

  const submit = () => {
    if (!canSave) return
    onSave({
      title: title.trim(),
      date: date || null,
      startAt: startAt || undefined,
      endAt: endAt || undefined,
      notes: notes || undefined,
    })
  }

  return (
    <div className="dialog-backdrop">
      <form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="编辑日程"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <h2>编辑日程</h2>

        <label className="dialog__field">
          <span>标题</span>
          <input aria-label="标题" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </label>

        <label className="dialog__field">
          <span>日期(清空则放入待安排)</span>
          <input aria-label="日期" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <div className="dialog__row">
          <label className="dialog__field">
            <span>开始时刻</span>
            <input aria-label="开始时刻" type="time" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
          </label>
          <label className="dialog__field">
            <span>结束时刻</span>
            <input aria-label="结束时刻" type="time" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
          </label>
        </div>

        <label className="dialog__field">
          <span>备注</span>
          <textarea aria-label="备注" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        {!dateOk && <p className="dialog__error">日期格式无效</p>}
        {!timeOk && <p className="dialog__error">结束时刻不能早于开始时刻</p>}

        <div className="dialog__actions">
          <button type="submit" className="dialog__save" disabled={!canSave}>
            保存
          </button>
          <button type="button" className="dialog__cancel" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="dialog__delete" onClick={onDelete}>
            删除日程
          </button>
        </div>
      </form>
    </div>
  )
}
