import type { ScheduleItem } from './types'

export interface ScheduleItemInput {
  title: string
  date: string | null
  startAt?: string
  endAt?: string
  notes?: string
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  // 兜底:极老环境(现代浏览器均有 randomUUID)
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}

/** 新建条目:position 由调用方给定(通常为追加到桶末尾 = 当前桶长度) */
export function createItem(input: ScheduleItemInput, position = 0, now = Date.now()): ScheduleItem {
  return {
    id: uuid(),
    title: input.title,
    notes: input.notes,
    date: input.date,
    startAt: input.startAt,
    endAt: input.endAt,
    isAllDay: input.startAt === undefined,
    done: false,
    position,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  }
}

/** 不可变更新:应用 patch 并刷新 updatedAt(同步三纪律 #2) */
export function withUpdates(item: ScheduleItem, patch: Partial<ScheduleItem>, now = Date.now()): ScheduleItem {
  return { ...item, ...patch, updatedAt: now }
}

/** 校验时刻区间:无 startAt 视为合法;有则 endAt 须不早于 startAt */
export function isValidTimeRange(startAt?: string, endAt?: string): boolean {
  if (!startAt || !endAt) return true
  return startAt <= endAt
}
