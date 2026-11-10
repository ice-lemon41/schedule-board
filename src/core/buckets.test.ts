import { describe, expect, it } from 'vitest'
import { buildBuckets, INBOX_KEY } from './buckets'
import { createItem } from './entity'
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

function item(id: string, date: string | null, position = 0, overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  const base = createItem({ title: id, date }, position, 1000)
  return { ...base, id, ...overrides }
}

describe('buildBuckets', () => {
  it('空列表 → 8 个空桶(待安排 + 7 天)', () => {
    const buckets = buildBuckets([], WINDOW)
    expect(buckets).toHaveLength(8)
    expect(buckets[0].key).toBe(INBOX_KEY)
    expect(buckets[0].label).toBe('待安排')
    expect(buckets[1].label).toBe('11-10 周二')
    expect(buckets[6].label).toBe('11-15 周日')
  })

  it('按 date 分桶;null 进待安排', () => {
    const buckets = buildBuckets([item('a', '2026-11-11'), item('b', null), item('c', '2026-11-10')], WINDOW)
    expect(buckets[0].items.map((i) => i.id)).toEqual(['b'])
    expect(buckets[1].items.map((i) => i.id)).toEqual(['c'])
    expect(buckets[2].items.map((i) => i.id)).toEqual(['a'])
  })

  it('窗口外的日期不显示(条目仍保留)', () => {
    const buckets = buildBuckets([item('out', '2026-11-01'), item('in', '2026-11-16')], WINDOW)
    expect(buckets.flatMap((b) => b.items.map((i) => i.id))).toEqual(['in'])
  })

  it('软删除条目被过滤', () => {
    const buckets = buildBuckets([item('gone', '2026-11-11', 0, { deletedAt: 123 })], WINDOW)
    expect(buckets[2].items).toHaveLength(0)
  })

  it('桶内按 position 排序,position 相同按 createdAt', () => {
    const late = item('late', '2026-11-11', 1, { createdAt: 2000 })
    const early = item('early', '2026-11-11', 1, { createdAt: 1500 })
    const first = item('first', '2026-11-11', 0)
    const buckets = buildBuckets([late, early, first], WINDOW)
    expect(buckets[2].items.map((i) => i.id)).toEqual(['first', 'early', 'late'])
  })
})
