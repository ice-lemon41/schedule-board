import type { ScheduleItem } from '../core/types'

/**
 * 数据访问的唯一入口(同步三纪律 #1):UI 永远通过本接口读写,不直接触碰 IndexedDB。
 * 未来接入后端同步时,只需提供新的实现。
 */
export interface ScheduleRepository {
  /** 全部未删除的条目(软删除的被过滤) */
  listAll(): Promise<ScheduleItem[]>
  /** 新增或整体覆盖一条条目 */
  put(item: ScheduleItem): Promise<void>
  /** 批量新增/覆盖(桶内重排后的增量持久化) */
  putMany(items: ScheduleItem[]): Promise<void>
}
