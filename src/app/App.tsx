import { useMemo, useState } from 'react'
import { INBOX_KEY } from '../core/buckets'
import { createDexieRepository } from '../data/dexieRepository'
import type { ScheduleRepository } from '../data/repository'
import { Board } from '../features/board/Board'
import { EditDialog, type EditPatch } from '../features/board/EditDialog'
import { useScheduleBoard } from '../features/board/useScheduleBoard'
import { QuickAdd } from '../features/quick-add/QuickAdd'

let defaultRepository: ScheduleRepository | undefined

/** 浏览器环境默认用 Dexie(IndexedDB);测试可注入 Repository */
function getDefaultRepository(): ScheduleRepository {
  if (!defaultRepository) defaultRepository = createDexieRepository()
  return defaultRepository
}

export function App({ repository }: { repository?: ScheduleRepository } = {}) {
  const repo = repository ?? getDefaultRepository()
  const board = useScheduleBoard(repo)

  const [focusKey, setFocusKey] = useState(INBOX_KEY)
  const [editingId, setEditingId] = useState<string | null>(null)
  const editingItem = board.items.find((item) => item.id === editingId) ?? null

  const focusLabel = useMemo(
    () => board.buckets.find((b) => b.key === focusKey)?.label ?? '待安排',
    [board.buckets, focusKey],
  )

  const saveEdit = (id: string, patch: EditPatch) => {
    board.updateItem(id, patch)
    setEditingId(null)
  }

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">日程看板</h1>
        <div className="app__nav">
          <button type="button" className="app__navbtn" aria-label="上一周" onClick={board.goPrevWeek}>
            <span>上一周</span>
            <span className="app__navarrow" aria-hidden="true">←</span>
          </button>
          <button type="button" className="app__navbtn" aria-label="回到今天" onClick={board.goToday}>
            <span>回到</span>
            <span>今天</span>
          </button>
          <button type="button" className="app__navbtn" aria-label="下一周" onClick={board.goNextWeek}>
            <span>下一周</span>
            <span className="app__navarrow" aria-hidden="true">→</span>
          </button>
          <span className="app__range">
            {board.windowDays[0]} ~ {board.windowDays[6]}
          </span>
        </div>
      </header>

      <QuickAdd targetLabel={focusLabel} onCreate={(parsed) => board.createFromQuickAdd(parsed, focusKey)} />

      <Board
        buckets={board.buckets}
        focusKey={focusKey}
        onFocus={setFocusKey}
        onToggleDone={board.toggleDone}
        onEdit={setEditingId}
        onDelete={board.removeItem}
        onMoveTo={board.moveTo}
      />

      {editingItem && (
        <EditDialog
          key={editingItem.id}
          item={editingItem}
          onSave={(patch) => saveEdit(editingItem.id, patch)}
          onCancel={() => setEditingId(null)}
          onDelete={() => {
            board.removeItem(editingItem.id)
            setEditingId(null)
          }}
        />
      )}
    </main>
  )
}
