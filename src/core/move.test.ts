import { describe, expect, it } from 'vitest'
import { buildBuckets, INBOX_KEY } from './buckets'
import { createItem } from './entity'
import { moveItem } from './move'
import { reorder } from './position'
import type { ScheduleItem } from './types'

const WINDOW = [
  '2026-11-10',
  '2026-11-11',
  '2026-11-12',
  '2026-11-13',
  '2026-11-14',
  '2026-11-15',
  '2026-11-16',
]

let seq = 0
function mk(title: string, date: string | null, position = 0): ScheduleItem {
  const item = createItem({ title, date }, position, 1000 + seq)
  seq += 1
  return item
}

describe('moveItem 跨桶移动', () => {
  it('从待安排移动到某一天(末尾),date 更新', () => {
    const a = mk('a', null, 0)
    const b = mk('b', '2026-11-11', 0)
    const c = mk('c', '2026-11-11', 1)
    const r = moveItem([a, b, c], a.id, '2026-11-11', 99, WINDOW)

    const bucket = buildBuckets(r.items, WINDOW).find((bk) => bk.key === '2026-11-11')!
    expect(bucket.items.map((i) => i.title)).toEqual(['b', 'c', 'a'])
    expect(bucket.items.find((i) => i.title === 'a')!.date).toBe('2026-11-11')
    // b、c 位置未变,只有 a 变化
    expect(r.changed.map((i) => i.title)).toEqual(['a'])
  })

  it('插入到中间位置,后续条目顺移', () => {
    const a = mk('a', null, 0)
    const b = mk('b', '2026-11-11', 0)
    const c = mk('c', '2026-11-11', 1)
    const r = moveItem([a, b, c], a.id, '2026-11-11', 1, WINDOW)

    expect(r.changed.map((i) => i.title).sort()).toEqual(['a', 'c']) // b 不动
    const bucket = buildBuckets(r.items, WINDOW).find((bk) => bk.key === '2026-11-11')!
    expect(bucket.items.map((i) => i.title)).toEqual(['b', 'a', 'c'])
  })

  it('移动到待安排桶,date 置空', () => {
    const b = mk('b', '2026-11-11', 0)
    const r = moveItem([b], b.id, INBOX_KEY, 0, WINDOW)
    expect(r.items.find((i) => i.id === b.id)!.date).toBeNull()
    expect(r.changed).toHaveLength(1)
  })
})

describe('moveItem 同桶移动', () => {
  it('与 reorder 结果一致', () => {
    const a = mk('a', '2026-11-11', 0)
    const b = mk('b', '2026-11-11', 1)
    const c = mk('c', '2026-11-11', 2)
    const items = [a, b, c]

    const viaMove = moveItem(items, c.id, '2026-11-11', 0, WINDOW)
    const viaReorder = reorder(buildBuckets(items, WINDOW).find((bk) => bk.key === '2026-11-11')!.items, c.id, 0)
    expect(viaMove.items.find((i) => i.id === c.id)!.position).toBe(0)
    expect(
      buildBuckets(viaMove.items, WINDOW)
        .find((bk) => bk.key === '2026-11-11')!
        .items.map((i) => i.id),
    ).toEqual(viaReorder.items.map((i) => i.id))
  })

  it('落回原位 → 无变化', () => {
    const b = mk('b', '2026-11-11', 0)
    const c = mk('c', '2026-11-11', 1)
    const r = moveItem([b, c], c.id, '2026-11-11', 1, WINDOW)
    expect(r.changed).toHaveLength(0)
    expect(r.items.map((i) => i.id)).toEqual([b.id, c.id])
  })
})

describe('moveItem 边界', () => {
  it('未知 id → 原样返回', () => {
    const a = mk('a', null, 0)
    const r = moveItem([a], 'nope', INBOX_KEY, 0, WINDOW)
    expect(r.changed).toHaveLength(0)
    expect(r.items).toHaveLength(1)
  })

  it('目标列不在窗口 → 原样返回', () => {
    const a = mk('a', null, 0)
    const r = moveItem([a], a.id, '2026-12-25', 0, WINDOW)
    expect(r.changed).toHaveLength(0)
  })
})
