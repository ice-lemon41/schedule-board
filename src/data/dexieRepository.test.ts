import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildBuckets } from '../core/buckets'
import { createItem } from '../core/entity'
import { reorder } from '../core/position'
import type { ScheduleItem } from '../core/types'
import { createDexieRepository } from './dexieRepository'
import type { ScheduleRepository } from './repository'

// 每个用例用独立的内存库,互不干扰
let seq = 0
function freshRepo(): ScheduleRepository {
  seq += 1
  return createDexieRepository(`test-db-${seq}`)
}

beforeEach(() => {
  // 目前每个用例新建库,无需额外清理
})

describe('ScheduleRepository(Dexie 实现)', () => {
  it('put 后 listAll 取回全部字段', async () => {
    const repo = freshRepo()
    const item = createItem({ title: '交周报', date: '2026-11-13', startAt: '15:00' }, 0)
    await repo.put(item)
    const all = await repo.listAll()
    expect(all).toHaveLength(1)
    expect(all[0]).toEqual(item)
  })

  it('put 相同 id 覆盖而非新增', async () => {
    const repo = freshRepo()
    const item = createItem({ title: '初版', date: null }, 0)
    await repo.put(item)
    await repo.put({ ...item, title: '更新版' })
    const all = await repo.listAll()
    expect(all).toHaveLength(1)
    expect(all[0].title).toBe('更新版')
  })

  it('软删除条目不出现在 listAll', async () => {
    const repo = freshRepo()
    const item = createItem({ title: '会被删', date: null }, 0)
    await repo.put(item)
    await repo.put({ ...item, deletedAt: Date.now() })
    expect(await repo.listAll()).toHaveLength(0)
  })

  it('putMany 批量写入并覆盖', async () => {
    const repo = freshRepo()
    const a = createItem({ title: 'a', date: null }, 0)
    const b = createItem({ title: 'b', date: null }, 1)
    await repo.putMany([a, b])
    await repo.putMany([{ ...a, position: 1 }, { ...b, position: 0 }])
    const all = await repo.listAll()
    expect(all).toHaveLength(2)
    expect(all.find((i) => i.id === a.id)?.position).toBe(1)
    expect(all.find((i) => i.id === b.id)?.position).toBe(0)
  })
})

describe('core + repository 集成:拖拽重排的持久化闭环', () => {
  it('重排 → putMany → listAll → buildBuckets 顺序保持', async () => {
    const repo = freshRepo()
    const window = ['2026-11-10', '2026-11-11', '2026-11-12']
    const mk = (title: string, position: number): ScheduleItem =>
      createItem({ title, date: '2026-11-11' }, position)

    const items = [mk('一', 0), mk('二', 1), mk('三', 2)]
    await repo.putMany(items)

    // listAll 返回主键序(随机 UUID),必须先经 buildBuckets 排序成桶,再重排(UI 层同理)
    const current = await repo.listAll()
    const bucket = buildBuckets(current, window)[2].items
    expect(bucket.map((i) => i.title)).toEqual(['一', '二', '三'])

    // 把「三」拖到最前
    const { changed } = reorder(bucket, items[2].id, 0)
    await repo.putMany(changed)

    const reloaded = await repo.listAll()
    const buckets = buildBuckets(reloaded, window)
    expect(buckets[2].items.map((i) => i.title)).toEqual(['三', '一', '二'])
  })
})
