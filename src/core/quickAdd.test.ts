import { describe, expect, it } from 'vitest'
import { parseQuickAdd } from './quickAdd'

const NOW = new Date(2026, 10, 10, 9, 0) // 2026-11-10 周二 09:00(本地时区)

describe('parseQuickAdd 日期 token', () => {
  it.each([
    ['今天 交周报', '2026-11-10'],
    ['今晚 散步', '2026-11-10'],
    ['明天 交周报', '2026-11-11'],
    ['明晚 约饭', '2026-11-11'],
    ['后天 团建', '2026-11-12'],
    ['大后天 复盘', '2026-11-13'],
    ['周五 交周报', '2026-11-13'], // 本周五
    ['周三 站会', '2026-11-11'],
    ['周二 复盘', '2026-11-10'], // 与今天同星期 → 今天
    ['周日 休息', '2026-11-15'],
    ['星期四 面试', '2026-11-12'],
    ['礼拜六 购物', '2026-11-14'],
    ['下周一 立项会', '2026-11-16'],
    ['下周二 例会', '2026-11-17'],
    ['下周日 家庭日', '2026-11-22'],
    ['本周五 提测', '2026-11-13'],
    ['11-12 打疫苗', '2026-11-12'],
    ['11月20日 体检', '2026-11-20'],
    ['11月20号 体检', '2026-11-20'],
    ['2026-11-20 体检', '2026-11-20'],
    ['2027-01-05 返校', '2027-01-05'],
    ['1月5日 返校', '2027-01-05'], // 今年已过 → 明年
    ['12-31 年会', '2026-12-31'],
  ])('%s → %s', (input, expected) => {
    expect(parseQuickAdd(input, NOW).date).toBe(expected)
  })

  it('无日期 token → 未安排', () => {
    const r = parseQuickAdd('交周报', NOW)
    expect(r.date).toBeNull()
    expect(r.title).toBe('交周报')
  })

  it('无效日期 token 原样保留在标题', () => {
    const r = parseQuickAdd('2月30日 诡异', NOW)
    expect(r.date).toBeNull()
    expect(r.title).toContain('2月30日')
  })
})

describe('parseQuickAdd 时刻 token', () => {
  it.each([
    ['15:00-16:30 部门例会', '15:00', '16:30'],
    ['明天 15:00-16:30 部门例会', '15:00', '16:30'],
    ['9:30 站会', '09:30', undefined],
    ['下午3点 导师会面', '15:00', undefined],
    ['下午3:30 导师会面', '15:30', undefined],
    ['晚上8点半 跑步', '20:30', undefined],
    ['晚上8点45分 跑步', '20:45', undefined],
    ['凌晨2点 上线', '02:00', undefined],
    ['中午12点 午餐', '12:00', undefined],
    ['3点 打卡', '03:00', undefined],
  ])('%s', (input, startAt, endAt) => {
    const r = parseQuickAdd(input, NOW)
    expect(r.startAt).toBe(startAt)
    expect(r.endAt).toBe(endAt)
    expect(r.isAllDay).toBe(false)
  })

  it('无时刻 → 全天', () => {
    const r = parseQuickAdd('周五 交周报', NOW)
    expect(r.startAt).toBeUndefined()
    expect(r.isAllDay).toBe(true)
  })

  it('非法时刻原样保留在标题', () => {
    const r = parseQuickAdd('25:00 开会', NOW)
    expect(r.startAt).toBeUndefined()
    expect(r.title).toContain('25:00')
  })
})

describe('parseQuickAdd 综合', () => {
  it('日期 + 时刻 + 标题清洗', () => {
    const r = parseQuickAdd('周五 下午3点 交周报', NOW)
    expect(r.title).toBe('交周报')
    expect(r.date).toBe('2026-11-13')
    expect(r.startAt).toBe('15:00')
    expect(r.matchedDate).toBe('周五')
    expect(r.matchedTime).toBe('下午3点')
  })

  it('日期 + 时刻区间 + 标题清洗', () => {
    const r = parseQuickAdd('11-20 15:00-16:00 部门例会', NOW)
    expect(r.title).toBe('部门例会')
    expect(r.date).toBe('2026-11-20')
    expect(r.startAt).toBe('15:00')
    expect(r.endAt).toBe('16:00')
  })

  it('区间倒挂时只取开始时刻', () => {
    const r = parseQuickAdd('18:00-17:00 倒挂', NOW)
    expect(r.startAt).toBe('18:00')
    expect(r.title).toContain('17:00')
  })

  it('只剩 token 时标题为空(UI 需自行拦截)', () => {
    const r = parseQuickAdd('明天', NOW)
    expect(r.title).toBe('')
  })
})
