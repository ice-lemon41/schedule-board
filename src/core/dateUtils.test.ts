import { describe, expect, it } from 'vitest'
import {
  addDays,
  boardWindow,
  dateLabel,
  isValidDateStr,
  parseDateStr,
  toDateStr,
  weekdayLabel,
  weekdayOf,
} from './dateUtils'

const NOW = new Date(2026, 10, 10, 9, 0) // 2026-11-10 周二 09:00(本地时区)

describe('toDateStr / parseDateStr', () => {
  it('本地时区 YYYY-MM-DD,补零', () => {
    expect(toDateStr(NOW)).toBe('2026-11-10')
    expect(toDateStr(new Date(2026, 0, 1))).toBe('2026-01-01')
  })

  it('parseDateStr 返回当天零点(本地时区)', () => {
    const d = parseDateStr('2026-11-10')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(10)
    expect(d.getDate()).toBe(10)
    expect(d.getHours()).toBe(0)
  })
})

describe('addDays', () => {
  it('跨月', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
  })

  it('跨年(含负数)', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
  })

  it('闰年 2 月', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01') // 平年
  })
})

describe('boardWindow', () => {
  it('从今天开始连续 7 天', () => {
    expect(boardWindow(NOW)).toEqual([
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
      '2026-11-16',
    ])
  })

  it('weekOffset 平移整周', () => {
    expect(boardWindow(NOW, 1)[0]).toBe('2026-11-17')
    expect(boardWindow(NOW, -1)[0]).toBe('2026-11-03')
    expect(boardWindow(NOW, 2)).toHaveLength(7)
  })
})

describe('isValidDateStr', () => {
  it('接受合法日期', () => {
    expect(isValidDateStr('2026-11-10')).toBe(true)
  })

  it('拒绝格式错误与不存在的日期', () => {
    expect(isValidDateStr('2026-2-1')).toBe(false)
    expect(isValidDateStr('2026-02-30')).toBe(false)
    expect(isValidDateStr('2026-13-01')).toBe(false)
    expect(isValidDateStr('abc')).toBe(false)
  })
})

describe('星期与标签', () => {
  it('weekdayOf:0=周日', () => {
    expect(weekdayOf('2026-11-10')).toBe(2) // 周二
    expect(weekdayOf('2026-11-15')).toBe(0) // 周日
  })

  it('标签', () => {
    expect(weekdayLabel('2026-11-10')).toBe('周二')
    expect(dateLabel('2026-11-10')).toBe('11-10')
  })
})
