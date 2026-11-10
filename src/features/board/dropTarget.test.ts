import { describe, expect, it } from 'vitest'
import { resolveDropTarget } from './dropTarget'

describe('resolveDropTarget', () => {
  it('over 为空 → null', () => {
    expect(resolveDropTarget(null, () => 0)).toBeNull()
    expect(resolveDropTarget(undefined, () => 0)).toBeNull()
  })

  it('落在卡片上 → 取其容器与下标', () => {
    const over = { id: 'item-1', data: { current: { sortable: { containerId: '2026-11-11', index: 2 } } } }
    expect(resolveDropTarget(over, () => 0)).toEqual({ key: '2026-11-11', index: 2 })
  })

  it('落在列上(空列/列背景)→ 追加到末尾', () => {
    const over = { id: '2026-11-11', data: { current: { isColumn: true } } }
    expect(resolveDropTarget(over, (key) => (key === '2026-11-11' ? 4 : 0))).toEqual({
      key: '2026-11-11',
      index: 4,
    })
  })
})
