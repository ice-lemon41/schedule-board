/** 日程条目 —— 本产品唯一的实体(同步三纪律 #3) */
export interface ScheduleItem {
  /** UUID v4,主键 */
  id: string
  title: string
  /** 备注(纯文本,可空) */
  notes?: string
  /** 归属日期 'YYYY-MM-DD'(本地时区);null 表示尚未安排(待安排桶) */
  date: string | null
  /** 开始时刻 'HH:mm'(可选) */
  startAt?: string
  /** 结束时刻 'HH:mm'(可选,须不早于 startAt) */
  endAt?: string
  /** 全天日程(= 无开始时刻) */
  isAllDay: boolean
  done: boolean
  /** 桶内排序序号(同桶内 0,1,2…;拖拽后整体重排) */
  position: number
  /** 软删除时间戳(epoch ms);非空即已删除 */
  deletedAt: number | null
  createdAt: number
  updatedAt: number
}
