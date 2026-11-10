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
          <button type="button" onClick={board.goPrevWeek}>
            ← 上一周
          </button>
          <button type="button" onClick={board.goToday}>
            回到今天
          </button>
          <button type="button" onClick={board.goNextWeek}>
            下一周 →
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
