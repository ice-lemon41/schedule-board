# 技术栈说明

> 更新日期:2026-11-10。选型依据见 [prior-art.md](../prior-art.md),产品范围见 [mvp-spec.md](mvp-spec.md)。

## 1. 总览

| 用途 | 技术 | 状态 |
|---|---|---|
| 语言 | TypeScript(strict 模式) | ✅ 全量使用 |
| UI 框架 | React 18 | ✅ MVP 完成 |
| 构建工具 | Vite 6 | ✅ |
| 拖拽交互 | dnd-kit(core + sortable + utilities) | ✅ 看板拖拽已接入 |
| 本地存储 | Dexie 4(IndexedDB) | ✅ 已封装在 Repository 层后 |
| 测试框架 | Vitest 5 | ✅ |
| DOM 测试环境 | happy-dom 21 | ✅ |
| 组件测试 | Testing Library(React 16 / user-event / jest-dom) | ✅ |
| IndexedDB 模拟 | fake-indexeddb 6 | ✅ |
| 包管理 | npm | ✅ |

**刻意不用的东西**(保持精简,需要时再引入):路由库(单页应用)、状态管理库(React 内建状态够用)、CSS 框架(先手写少量样式)、日期库(自研 dateUtils 约 80 行,覆盖 7 天窗口/跨月跨年/闰年;若将来出现复杂时区需求再评估 dayjs)、UI 组件库、ESLint/Prettier(项目变大后再加)。

## 2. 选型理由

### TypeScript(strict)
- 领域逻辑(日期、排序)是最容易出微妙 bug 的地方,类型即第一道防线。
- 实测教训:开发 quickAdd 解析器时一处参数错配(`tryMatch(text, re, resolve)` 少传了 `text`),运行时花了很久排查,而 `tsc --noEmit` 一秒就能抓出。因此 `npm test` 已并入类型检查。

### React 18(而非 Vue 或其他)
- dnd-kit 是拖拽场景最成熟的 React 库——看板的核心交互就是拖拽。
- 生态与资料最丰富,后续维护成本低。

### Vite 6(而非 Webpack/Rollup 手配)
- 开发热更新极快,零配置起步;Vitest 与之同源,配置天然共享。

### dnd-kit(而非 react-beautiful-dnd)
- react-beautiful-dnd 已停止维护(Atlassian 归档);dnd-kit 是当前事实标准。
- 轻量、无障碍支持好、跨列 + 列内排序的看板场景文档示例齐全。

### Dexie 4 / IndexedDB(而非 localStorage)
- localStorage 只能存字符串且同步阻塞、容量小;IndexedDB 支持结构化对象、索引和批量写。
- Dexie 提供了简洁的 Promise API 和 TypeScript 友好的表定义。
- **关键约束**:Dexie 只出现在 `src/data/dexieRepository.ts` 一个文件里,UI 通过 `ScheduleRepository` 接口访问——将来接后端同步时换实现即可(见 mvp-spec.md「同步三纪律」)。

### Vitest 5 + happy-dom 21(而非 Jest + jsdom)
- 与 Vite 共享转译管线,零额外配置;happy-dom 比 jsdom 更快更轻。
- **安全记录**:初装时 npm audit 报出 vitest/happy-dom/tinypool 各有已知漏洞(均在测试工具链,不影响产品运行时),已升级至 5.1.0 / 21.0.4,当前 `npm audit` 为 0 漏洞。

### fake-indexeddb
- 让 Dexie 的集成测试直接跑在 Node 里(纯内存),无需真实浏览器,CI 友好。

## 3. 目录结构(当前)

```
src/
├── core/                    # 纯领域逻辑,零副作用 —— 单测重点
│   ├── types.ts             #   ScheduleItem 实体(全产品唯一实体)
│   ├── entity.ts            #   createItem / withUpdates / 时间区间校验
│   ├── dateUtils.ts         #   7 天窗口、跨月跨年、闰年、日期标签
│   ├── buckets.ts           #   分桶:待安排 + 7 天(列不落库,由 date 推导)
│   ├── position.ts          #   桶内重排(整数序号 + 整体重编号)
│   ├── move.ts              #   跨桶/同桶移动(拖拽核心)
│   └── quickAdd.ts          #   自然语言录入解析(「周五 下午3点 交周报」)
├── data/
│   ├── repository.ts        # ScheduleRepository 接口(数据访问唯一入口)
│   └── dexieRepository.ts   # Dexie/IndexedDB 实现
├── features/
│   ├── board/               # 看板:列/卡片/编辑对话框/状态 hook/拖拽落点解析
│   └── quick-add/           # 快速录入框 + 解析预览
├── app/                     # 根组件(App.tsx 接线各部分)
└── test/setup.ts            # Testing Library 全局匹配器 + afterEach(cleanup)
```

依赖方向单向:`app → features → core / data`,`core` 不依赖任何其他层。

## 4. 常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 启动开发服务器(热更新) |
| `npm run build` | 类型检查 + 生产构建(输出 `dist/`) |
| `npm run preview` | 本地预览生产构建 |
| `npm test` | **类型检查 + 全量测试**(提交前必跑) |
| `npm run test:watch` | 测试监听模式 |

## 5. 测试分层策略

| 层 | 方式 | 数量(当前) |
|---|---|---|
| core | 纯函数单测(日期分桶/重排/移动/解析表,含边界:月末、闰年、无效日期、区间倒挂) | 78 |
| data | fake-indexeddb 集成(CRUD、软删除、重排持久化闭环) | 5 |
| features/board | 落点解析单测 + 状态 hook 测试(renderHook + 假 Repository) | 10 |
| app | Testing Library 组件测试(渲染、录入、完成、编辑、删除、翻周、刷新保持) | 10 |

**UI 测试策略说明**:真实拖拽手势由 dnd-kit 库自身负责,组件测试不做手势模拟;拖拽的落点计算(dropTarget)、移动与持久化(moveItem + useScheduleBoard)分别有独立测试覆盖。

约定:**每次代码改动后,新增/修改的行为必须有对应测试,`npm test` 全绿后才算完成**(见 AGENTS.md 规则 2)。

## 6. 演进预留(与同步三纪律对应)

- **接入后端同步**:新增 `SyncRepository`/远端实现,替换 `dexieRepository` 注入;实体已带 `id`(UUID)+ `updatedAt` + `deletedAt`(软删除),按行合并所需信息齐备。
- **改用小程序(Taro 等)**:core 层是纯 TS,可原样复用;仅 data/app 层需适配。
- **复杂日历需求**(时区、重复日程):优先扩展 `dateUtils` 或届时引入 dayjs;参考 prior-art.md「Nextcloud Calendar 不重复造轮子」一节。
