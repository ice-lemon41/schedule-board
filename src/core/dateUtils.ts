/** 本地时区 'YYYY-MM-DD' */
export function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayStr(now = new Date()): string {
  return toDateStr(now)
}

/** 'YYYY-MM-DD' → 本地时区当天零点 */
export function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(dateStr: string, n: number): string {
  const d = parseDateStr(dateStr)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

/** 看板窗口:从「今天 + weekOffset*7」开始的连续 7 天 */
export function boardWindow(now = new Date(), weekOffset = 0): string[] {
  const start = addDays(todayStr(now), weekOffset * 7)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** 星期几,0=周日 */
export function weekdayOf(dateStr: string): number {
  return parseDateStr(dateStr).getDay()
}

export function isToday(dateStr: string, now = new Date()): boolean {
  return dateStr === todayStr(now)
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function weekdayLabel(dateStr: string): string {
  return WEEKDAY_LABELS[weekdayOf(dateStr)]
}

/** '11-10' 式短日期显示 */
export function dateLabel(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${m}-${d}`
}

/** 校验日期字符串:格式必须为 YYYY-MM-DD,且是真实日期(如 2026-02-30 非法) */
export function isValidDateStr(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  const [y, m, d] = dateStr.split('-').map(Number)
  const parsed = new Date(y, m - 1, d)
  return parsed.getFullYear() === y && parsed.getMonth() === m - 1 && parsed.getDate() === d
}
