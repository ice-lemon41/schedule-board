import Dexie, { type Table } from 'dexie'
import type { ScheduleItem } from '../core/types'
import type { ScheduleRepository } from './repository'

class ScheduleDb extends Dexie {
  items!: Table<ScheduleItem, string>

  constructor(name = 'schedule-board') {
    super(name)
    // 索引:主键 id;updatedAt 为将来多端同步预留
    this.version(1).stores({ items: 'id, updatedAt' })
  }
}

/** 基于 IndexedDB(Dexie)的仓储实现 */
export function createDexieRepository(dbName = 'schedule-board'): ScheduleRepository {
  const db = new ScheduleDb(dbName)
  return {
    async listAll() {
      const all = await db.items.toArray()
      return all.filter((item) => item.deletedAt === null)
    },
    async put(item) {
      await db.items.put(item)
    },
    async putMany(items) {
      await db.items.bulkPut(items)
    },
  }
}
