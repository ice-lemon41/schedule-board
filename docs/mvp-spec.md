# MVP 规格(精简版)

> 定稿日期:2026-11-10。由 5 个决策问题梳理而来,调研依据见 [prior-art.md](../prior-art.md)。

## 1. 产品定义

**打开页面,第一屏就是从今天起 7 天的日程看板。** 日程卡片可以在天与天之间拖拽;没有定日期的日程放「待安排」桶;想到什么先记下来,再拖到某一天。

## 2. 决策记录

| 决策点 | 结论 | 理由 |
|---|---|---|
| 形态 | 纯 Web 应用(PC/手机浏览器) | 迭代最快、拖拽体验最好、部署极简 |
| 存储 | 纯本地(IndexedDB),不设后端账号 | MVP 零运维;同步后置 |
| 粒度 | 天 + 可选起止时间(HH:mm) | 比纯按天多两个字段,信息量翻倍 |
| 加分项 | 仅自然语言快速录入 | 成本低、录入体验提升大 |
| 技术栈 | React 18 + TypeScript + Vite | dnd-kit 拖拽生态最成熟 |

## 3. 同步三纪律(为后期加同步留缝,不增加 MVP 功能量)

1. **所有数据访问收在 Repository 层后面**,UI 不直接触碰 IndexedDB。
2. **实体自带 UUID 主键 + `updatedAt` 时间戳 + 软删除(`deletedAt`)**,冲突检测所需信息从第一天就有。
3. **只有一种实体 `ScheduleItem`**,无外键关联网络,按行独立合并。

## 4. 数据模型(仅一种实体)

```ts
interface ScheduleItem {
  id: string          // UUID v4
  title: string
  notes?: string      // 备注,纯文本
  date: string | null // 'YYYY-MM-DD'(本地时区);null = 待安排桶
  startAt?: string    // 'HH:mm',可选
  endAt?: string      // 'HH:mm',可选,须 >= startAt
  isAllDay: boolean   // 全天日程(无时刻)
  done: boolean       // 完成勾选
  position: number    // 桶内排序序号(0,1,2…;拖拽后桶内整体重排)
  deletedAt: number | null  // 软删除
  createdAt: number   // epoch ms
  updatedAt: number   // epoch ms
}
```

要点:
- **「列」不落库**:7 天列 + 待安排列全部由 `date` 字段推导(参考 Vikunja「一套数据多视图」)。
- 排序用整数序号 + 桶内整体重排:本地单用户、桶内条目量很小,拖拽后对整桶重新编号(0,1,2…),只持久化位置变化的条目;实现最简、行为最好测。分数索引(fractional indexing)推迟到实现多端同步时再引入。
- 日期语义:**本地时区**,字符串比较排序;跨天/月末由日期库处理,测试必须覆盖。

## 5. 核心循环(MVP 必须全部完成)

1. 看板:今天起 7 天,围绕成圆环(今天在正上方、顺时针排列),环外侧挂每天的事项;中心圆为「待安排」。
2. 新建:在任意列输入标题回车创建;支持自然语言日期(「周五 交周报」→ 周五)。
3. 编辑:点卡片改标题/时间/备注。
4. 拖拽:卡片跨天移动;同列内拖拽排序(待安排桶同理)。
5. 完成:勾选,样式弱化但保留在列中。
6. 删除:卡片菜单删除(软删除)。
7. 翻周:「上一周/下一周」导航,看板窗口平移 7 天。

## 6. 自然语言快速录入(唯一加分项)

输入解析规则(实现为纯函数,便于单测):
- 「今天/明天/后天」、星期(「周三」,未过则本周,过了则下周)、「下周一」、`MM-DD`、`YYYY-MM-DD`、`MM月DD日`
- 时刻:「15:00」「下午3点」→ `startAt`
- 解析结果在输入框下方实时预览(「将安排到 周五 11-13」),回车确认
- 解析不到日期 → 落入当前聚焦列;再无聚焦 → 待安排桶

## 7. 明确不做(MVP 阶段)

提醒/通知、重复日程、颜色标签、多用户协作、后端与多端同步、CalDAV、导入导出、统计报表、移动端专属适配(响应式布局即可)。

## 8. 架构与目录

```
src/
├── core/       # 纯领域逻辑,无副作用,单测重点
│   ├── types.ts        # ScheduleItem 等类型
│   ├── dateUtils.ts    # 7天窗口、日期格式化(本地时区)
│   ├── buckets.ts      # 分桶(7天 + 待安排)、桶内排序
│   ├── position.ts     # 桶内重排(拖拽后的重新编号)
│   └── quickAdd.ts     # 自然语言解析
├── data/
│   ├── repository.ts   # ScheduleRepository 接口
│   └── dexie.ts        # Dexie 实现(IndexedDB)
├── features/
│   ├── board/          # 7天看板 + 拖拽(dnd-kit)
│   └── quick-add/      # 录入框 + 解析预览
└── app/                # 根组件、路由(仅一页)
```

测试基线(Vitest):
- `core` 全量单测:日期分桶(今天/明天/跨月/跨年)、时区边界、quickAdd 解析表、position 重排正确性。
- Repository 集成测试:fake-indexeddb 环境 CRUD + 软删除。
- UI 冒烟:渲染看板、新建、拖拽、勾选(testing-library)。

## 9. 验收标准(完成 = 全部满足 + 测试全绿)

> 2026-11-10 核验通过,全部达标。括号内为对应的自动化测试。

- [x] 空库打开 → 显示今天起 7 天空看板 + 待安排列(App.test「空库打开」)
- [x] 输入「周五 交周报」→ 卡片落在周五列(App.test「周五 交周报」,验收标准原样用例)
- [x] 拖卡片到明天 → 刷新页面后位置保持(IndexedDB 持久化)(三层覆盖:moveItem 单测改 date、useScheduleBoard.moveTo 持久化、App 重新挂载数据保持;真实拖拽手势由 dnd-kit 负责)
- [x] 拖动排序 → 顺序保持(reorder/moveItem 单测 + useScheduleBoard 同桶重排并持久化)
- [x] 勾选/编辑/删除生效(App.test:勾选完成、编辑对话框改标题日期、删除为软删除)
- [x] 「下一周」窗口平移(App.test「翻周与回到今天」)
- [x] 全部测试通过(`npm test` = tsc --noEmit + 103 个测试)
