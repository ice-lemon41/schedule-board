import { addDays, isValidDateStr, todayStr, weekdayOf } from './dateUtils'

export interface QuickAddResult {
  /** 清洗掉日期/时刻 token 后的标题 */
  title: string
  /** 解析出的归属日期;null = 未安排(待安排桶) */
  date: string | null
  startAt?: string
  endAt?: string
  /** 全天 = 无开始时刻 */
  isAllDay: boolean
  /** 命中的原始 token(输入框下方预览用) */
  matchedDate?: string
  matchedTime?: string
}

interface Span {
  start: number
  end: number
}

const CN_NUM: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 }

function pad2(n: number): string {
  return `${n}`.padStart(2, '0')
}

function hhmm(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`
}

// —— 日期 token ——————————————————————————————————————

/** 目标星期与今天的偏移;nextWeek 时按中文习惯(一周从周一开始)落到下一个自然周 */
function weekdayOffset(target: number, now: Date, nextWeek: boolean): number {
  const current = weekdayOf(todayStr(now))
  if (!nextWeek) return (target - current + 7) % 7
  // c/t 为周一开头的星期序号(周一=0 … 周日=6)
  const c = (current + 6) % 7
  const t = (target + 6) % 7
  return 7 - c + t
}

function ymd(y: number, m: number, d: number): string | null {
  const s = `${y}-${pad2(m)}-${pad2(d)}`
  return isValidDateStr(s) ? s : null
}

/** '11月20日' 式:今年已过则取明年 */
function mdThisOrNextYear(m: number, d: number, now: Date): string | null {
  const thisYear = ymd(now.getFullYear(), m, d)
  if (thisYear && thisYear >= todayStr(now)) return thisYear
  return ymd(now.getFullYear() + 1, m, d)
}

interface TokenMatch<T> {
  span: Span
  token: string
  value: T
}

function tryMatch<T>(text: string, re: RegExp, resolve: (m: RegExpExecArray) => T | null): TokenMatch<T> | null {
  const m = re.exec(text)
  if (!m) return null
  const value = resolve(m)
  if (value === null) return null
  return { span: { start: m.index, end: m.index + m[0].length }, token: m[0], value }
}

/** 从文本中解析第一个日期 token;未命中或无效返回 null */
function parseDateToken(text: string, now: Date): TokenMatch<string> | null {
  const today = todayStr(now)
  return (
    tryMatch(text, /大后天/, () => addDays(today, 3)) ??
    tryMatch(text, /后天/, () => addDays(today, 2)) ??
    tryMatch(text, /明晚|明天/, () => addDays(today, 1)) ??
    tryMatch(text, /今晚|今天/, () => addDays(today, 0)) ??
    tryMatch(text, /下(?:周|星期|礼拜)([一二三四五六日天])/, (m) =>
      addDays(today, weekdayOffset(CN_NUM[m[1]] ?? -1, now, true)),
    ) ??
    tryMatch(text, /本(?:周|星期|礼拜)([一二三四五六日天])/, (m) =>
      addDays(today, weekdayOffset(CN_NUM[m[1]] ?? -1, now, false)),
    ) ??
    tryMatch(text, /(?:周|星期|礼拜)([一二三四五六日天])/, (m) =>
      addDays(today, weekdayOffset(CN_NUM[m[1]] ?? -1, now, false)),
    ) ??
    tryMatch(text, /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/, (m) => ymd(Number(m[1]), Number(m[2]), Number(m[3]))) ??
    tryMatch(text, /(\d{1,2})月(\d{1,2})[日号]?/, (m) => mdThisOrNextYear(Number(m[1]), Number(m[2]), now)) ??
    tryMatch(text, /(\d{1,2})-(\d{1,2})/, (m) => mdThisOrNextYear(Number(m[1]), Number(m[2]), now))
  )
}

// —— 时刻 token ——————————————————————————————————————

function time2(hour: number, minute: number): string | null {
  if (hour > 23 || minute > 59) return null
  return hhmm(hour, minute)
}

interface TimeValue {
  start: string
  end?: string
}

/** 上午/下午等修饰语:按中文习惯换算 24 小时制 */
function periodTime(period: string, hour: number, minute: number): TimeValue | null {
  if (hour < 1 || hour > 12) return null
  if (minute > 59) return null
  let h = hour
  if (period === '下午' || period === '傍晚' || period === '晚上' || period === '中午') {
    if (hour <= 11) h = hour + 12
  }
  return { start: hhmm(h, minute) }
}

/** 从文本中解析第一个时刻 token;未命中或无效返回 null */
function parseTimeToken(text: string): TokenMatch<TimeValue> | null {
  return (
    // 优先级:时刻区间 > 带修饰语 > HH:mm > N点(半/分)
    tryMatch(text, /(\d{1,2}):(\d{2})\s*[-~到至]\s*(\d{1,2}):(\d{2})/, (m) => {
      const s = time2(Number(m[1]), Number(m[2]))
      const e = time2(Number(m[3]), Number(m[4]))
      if (!s || !e || s > e) return null
      return { start: s, end: e }
    }) ??
    tryMatch(
      text,
      /(上午|早上|凌晨|中午|下午|傍晚|晚上)\s*(\d{1,2})(?:[:：](\d{2})|点(半)?(\d{1,2}分)?)?/,
      (m) =>
        periodTime(
          m[1],
          Number(m[2]),
          m[3] ? Number(m[3]) : m[4] ? 30 : m[5] ? Number(m[5].slice(0, -1)) : 0,
        ),
    ) ??
    tryMatch(text, /(\d{1,2}):(\d{2})/, (m) => {
      const s = time2(Number(m[1]), Number(m[2]))
      return s === null ? null : { start: s }
    }) ??
    tryMatch(text, /(\d{1,2})\s*点\s*(半|\d{1,2}分)?/, (m) => {
      const minute = m[2] === '半' ? 30 : m[2] ? Number(m[2].slice(0, -1)) : 0
      const s = time2(Number(m[1]), minute)
      return s === null ? null : { start: s }
    })
  )
}

// —— 组合 ——————————————————————————————————————————

function removeSpans(text: string, spans: Span[]): string {
  if (spans.length === 0) return text.trim()
  const sorted = [...spans].sort((a, b) => a.start - b.start)
  let out = ''
  let cursor = 0
  for (const s of sorted) {
    if (s.start < cursor) continue // 重叠时保留先到者
    out += text.slice(cursor, s.start)
    cursor = s.end
  }
  out += text.slice(cursor)
  return out.replace(/\s+/g, ' ').trim()
}

/**
 * 解析快速录入文本:抽出日期与时刻 token,剩余文字作为标题。
 * 例:「周五 下午3点 交周报」→ { date: <本周五>, startAt: '15:00', title: '交周报' }
 */
export function parseQuickAdd(text: string, now = new Date()): QuickAddResult {
  const spans: Span[] = []

  let date: string | null = null
  let matchedDate: string | undefined
  const dateMatch = parseDateToken(text, now)
  if (dateMatch) {
    date = dateMatch.value
    matchedDate = dateMatch.token
    spans.push(dateMatch.span)
  }

  let startAt: string | undefined
  let endAt: string | undefined
  let matchedTime: string | undefined
  const timeMatch = parseTimeToken(text)
  if (timeMatch) {
    startAt = timeMatch.value.start
    endAt = timeMatch.value.end
    matchedTime = timeMatch.token
    spans.push(timeMatch.span)
  }

  return {
    title: removeSpans(text, spans),
    date,
    startAt,
    endAt,
    isAllDay: startAt === undefined,
    matchedDate,
    matchedTime,
  }
}
