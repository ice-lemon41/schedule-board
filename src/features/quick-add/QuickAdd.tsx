import { useMemo, useState } from 'react'
import { dateLabel, weekdayLabel } from '../../core/dateUtils'
import { parseQuickAdd, type QuickAddResult } from '../../core/quickAdd'

interface Props {
  /** 无日期 token 时的目标列标签(当前聚焦列) */
  targetLabel: string
  onCreate: (parsed: QuickAddResult) => void
}

export function QuickAdd({ targetLabel, onCreate }: Props) {
  const [text, setText] = useState('')
  const parsed = useMemo(() => (text.trim() ? parseQuickAdd(text) : null), [text])

  const submit = () => {
    if (!parsed || !parsed.title.trim()) return
    onCreate(parsed)
    setText('')
  }

  const targetText = parsed?.date ? `${dateLabel(parsed.date)} ${weekdayLabel(parsed.date)}` : targetLabel
  const timeText = parsed?.startAt ? ` ${parsed.startAt}${parsed.endAt ? `-${parsed.endAt}` : ''}` : ''

  return (
    <form
      className="quickadd"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <input
        className="quickadd__input"
        aria-label="快速录入"
        placeholder="输入新日程,如:周五 下午3点 交周报(支持 今天/明天/周五/下周一/11月20日 等写法)"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit" className="quickadd__submit" disabled={!parsed || !parsed.title.trim()}>
        添加
      </button>
      {parsed && (
        <p className="quickadd__preview" role="status">
          将安排到:{targetText}
          {timeText}
          {parsed.title.trim() ? '' : '(请输入日程内容)'}
        </p>
      )}
    </form>
  )
}
