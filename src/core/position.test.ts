import { describe, expect, it } from 'vitest'
import { createItem } from './entity'
import type { ScheduleItem } from './types'
import { nextPosition, reorder } from './position'

function bucketOf(ids: string[], positions: number[]): ScheduleItem[] {
  return ids.map((id, i) => {
    const base = createItem({ title: id, date: null }, positions[i], 1000 + i)
    return { ...base, id }
  })
}

describe('reorder', () => {
  it('移动条目并对整桶重新编号', () => {
    const bucket = bucketOf(['a', 'b', 'c'], [0, 1, 2])
    const result = reorder(bucket, 'c', 0)
    expect(result.items.map((i) => i.id)).toEqual(['c', 'a', 'b'])
    expect(result.items.map((i) => i.position)).toEqual([0, 1, 2])
  })

  it('changed 只包含 position 变化的条目', () => {
    const bucket = bucketOf(['a', 'b', 'c', 'd'], [0, 1, 2, 3])
    const result = reorder(bucket, 'a', 1) // → [b,a,c,d]
    expect(result.items.map((i) => i.id)).toEqual(['b', 'a', 'c', 'd'])
    expect(result.changed.map((i) => i.id).sort()).toEqual(['a', 'b'])
  })

  it('移回原位 → 无变化、引用不变', () => {
    const bucket = bucketOf(['a', 'b', 'c'], [0, 1, 2])
    const result = reorder(bucket, 'b', 1)
    expect(result.changed).toHaveLength(0)
    expect(result.items).toEqual(bucket)
  })

  it('越界索引被收敛到合法范围', () => {
    const bucket = bucketOf(['a', 'b'], [0, 1])
    const result = reorder(bucket, 'a', 99)
    expect(result.items.map((i) => i.id)).toEqual(['b', 'a'])
  })

  it('id 不存在 → 原样返回', () => {
    const bucket = bucketOf(['a'], [0])
    const result = reorder(bucket, 'zzz', 0)
    expect(result.items.map((i) => i.id)).toEqual(['a'])
    expect(result.changed).toHaveLength(0)
  })

  it('刷新受影响条目的 updatedAt', () => {
    const bucket = bucketOf(['a', 'b'], [0, 1])
    const result = reorder(bucket, 'b', 0, 2000)
    expect(result.changed.length).toBeGreaterThan(0)
    expect(result.changed.every((i) => i.updatedAt === 2000)).toBe(true)
  })
})

describe('nextPosition', () => {
  it('空桶 → 0', () => {
    expect(nextPosition([])).toBe(0)
  })

  it('追加到最大 position 之后(允许乱序存量)', () => {
    const bucket = bucketOf(['a', 'b'], [5, 2])
    expect(nextPosition(bucket)).toBe(6)
  })
})
