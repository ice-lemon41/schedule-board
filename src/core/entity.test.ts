import { describe, expect, it } from 'vitest'
import { createItem, isValidTimeRange, withUpdates } from './entity'

describe('createItem', () => {
  it('默认字段:未完成、未删除、全天(无开始时刻)', () => {
    const item = createItem({ title: '交周报', date: '2026-11-13' }, 0, 1000)
    expect(item.done).toBe(false)
    expect(item.deletedAt).toBeNull()
    expect(item.isAllDay).toBe(true)
    expect(item.position).toBe(0)
    expect(item.createdAt).toBe(1000)
    expect(item.updatedAt).toBe(1000)
    expect(item.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('有开始时刻则非全天', () => {
    const item = createItem({ title: '站会', date: null, startAt: '09:30' }, 3)
    expect(item.isAllDay).toBe(false)
    expect(item.position).toBe(3)
  })
})

describe('withUpdates', () => {
  it('不可变更新并刷新 updatedAt', () => {
    const item = createItem({ title: 'a', date: null }, 0, 1000)
    const updated = withUpdates(item, { title: 'b' }, 2000)
    expect(updated).not.toBe(item)
    expect(updated.title).toBe('b')
    expect(updated.updatedAt).toBe(2000)
    expect(item.title).toBe('a') // 原对象不变
  })
})

describe('isValidTimeRange', () => {
  it('合法区间', () => {
    expect(isValidTimeRange('09:00', '10:00')).toBe(true)
  })

  it('endAt 早于 startAt 非法', () => {
    expect(isValidTimeRange('10:00', '09:00')).toBe(false)
  })

  it('缺省视为合法', () => {
    expect(isValidTimeRange(undefined, '10:00')).toBe(true)
    expect(isValidTimeRange('09:00', undefined)).toBe(true)
  })
})
