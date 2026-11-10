# Prior Art:同类项目调研

> 调研日期:2026-11-10
> 调研目标:为「能看到未来 7 天日程的日程管理看板 / APP / 小程序」寻找参考。
> 调研方式:通过 GitHub API 抓取各项目的 README、仓库目录结构、热门 Issue,并补充阅读了 Vikunja 官网功能页。

## 一、调研对象概览

| # | 项目 | Stars | 技术栈 | 许可证 | 维护状态 | 定位 |
|---|------|-------|--------|--------|----------|------|
| 1 | [Vikunja](https://github.com/go-vikunja/vikunja) | ~6.0k | Go + Vue | AGPL-3.0 | ✅ 非常活跃 | 自托管任务管理,API 优先 |
| 2 | [Planka](https://github.com/plankanban/planka) | ~12.7k | React + Node(Sails)+ PostgreSQL | fair-code(非开源) | ✅ 活跃 | 团队实时协作看板 |
| 3 | [Super Productivity](https://github.com/johannesjo/super-productivity) | ~23.6k | Angular + TypeScript,多端 | MIT | ✅ 非常活跃 | 个人日程规划 + 时间统计,本地优先 |
| 4 | [Nextcloud Calendar](https://github.com/nextcloud/calendar) | ~1.2k | Vue + FullCalendar | AGPL-3.0 | ✅ 活跃 | 标准日历(CalDAV) |
| 5 | [Focalboard](https://github.com/mattermost/focalboard) | ~26.5k | TypeScript + Go | 自定义许可 | ⚠️ 已停止维护 | Trello/Notion 替代品 |
| 补充 | [wx_calendar](https://github.com/treadpit/wx_calendar) / [lspriv/wx-calendar](https://github.com/lspriv/wx-calendar) | 2.4k / 0.4k | 微信小程序组件 | — | 停更 / 活跃 | 小程序日历 UI 组件 |

> 许可证提示:Vikunja、Nextcloud Calendar 是 AGPL(传染性,只能参考思路,直接抄代码会要求整个项目开源);Planka 是 fair-code(源码可见但**不是**开源许可证,禁止抄代码);Super Productivity 是 MIT(最宽松,可放心参考);Focalboard 许可证需二次确认。**总体原则:参考设计,不搬运代码。**
>
> 另外注意:在 GitHub 上搜索「日程管理」,中文结果几乎没有直接对口的活跃项目(多为无关仓库),说明中文市场的同类产品(滴答清单等)基本闭源;倒是在「calendar 小程序」方向有一批小程序日历组件可直接复用。

## 二、逐项分析

### 1. Vikunja — 「一套数据,多种视图」+ API 优先

- **是什么**:可自托管的任务管理器,主打「你真正拥有的任务管理器」。
- **核心功能**(来自官网功能页):
  - 四种视图展示同一批任务:**List / Gantt / Table / Kanban**
  - 任务带截止日期、**提醒**、**重复任务**(周/月周期)、子任务
  - **Quick Add Magic**:输入任务标题时用自然语言带出日期、标签、负责人,免去二次编辑
  - 标签、优先级、任务关联(blocking/子任务)、附件、保存的过滤器
  - **CalDAV 集成**(让手机系统日历直接订阅任务)
  - 从 Todoist / Trello / Microsoft To-Do 导入
- **架构与核心文件**:`frontend/`(Vue 单独一个应用)+ `pkg/`(Go 模块:`models`、`routes`、`caldav`、`migration`、`events`、`notifications`、`websocket`、`plugins`);**OpenAPI/Swagger 规范齐全**,有在线 demo。
- **Issue 洞察**:最热开放 issue 是「把 Vikunja 当 CalDAV 客户端用」——用户强烈希望和现有日历生态互通。
- **有趣的细节**:仓库根目录有 `AGENTS.md` 和 `CLAUDE.md`,README 明确写了「开发中大量使用 LLM 辅助编程」。

### 2. Planka — 看板领域最干净的数据模型参考

- **是什么**:面向团队的自托管实时看板(类 Trello),免费社区版 + 付费 Pro 版。
- **核心功能**:项目 → 看板 → 列表 → 卡片,拖拽排序;**实时多人同步**(Socket.IO);卡片支持 Markdown 描述、附件、评论、标签、自定义字段、秒表和截止日期;100+ 渠道通知;Webhook;**带 Swagger 的 REST API**;2FA;i18n;Docker 一键部署。Pro 版才提供日历/时间线/地图视图、重复卡片、模板、移动端。
- **核心文件 / 数据模型**(`server/api/models/`,Sails.js 风格,一实体一文件):
  - 容器层级:`Project` → `Board` → `List` → `Card`
  - 关联实体:`BoardMembership` / `CardMembership` / `CardLabel` / `CardSubscription`
  - 卡片附属:`Comment`、`Attachment`、`UploadedFile`、`CustomField(+Group/Value)`
  - 系统类:`User`、`Session`、`Notification`、`Webhook`、`Config`、`Task`(定时任务)
- **Issue 洞察**:
  - **`#19 Mobile Support`(23 条评论)**——移动端是呼声最高的功能请求
  - `#602 Public Board`(21 条)——公开只读看板
  - 大量运维类痛点:SMTP 不工作、Nginx 反代 SSL、WebSocket 连不上 → **自部署产品的通知和代理配置是重灾区**
- **教训**:Pro 版把日历视图、重复卡片、移动端都拿来收费,说明这些是用户愿意付费的高价值点。

### 3. Super Productivity — 与本项目目标最接近的产品

- **是什么**:个人待办 + 时间盒(timeboxing)+ 时间统计,「**离线优先、本地优先、无需账号、不收集数据**」。
- **核心功能**(README Features 节):
  - **Planner 规划器 + Schedule 时间轴**:把任务排到一天的日程时间轴上,**和日历事件并排显示**——这正是「7 天日程」的核心交互
  - 看板视图:内置 **Kanban**、**艾森豪威尔矩阵**,可自定义看板
  - 时间盒 / 时间跟踪 / 工作日志,可导出时间表
  - 专注模式:**番茄钟 / Flowtime / 倒计时**;休息提醒;反拖延功能;个人习惯指标
  - 与 Jira/Trello/GitHub/GitLab/OpenProject 等集成;基础 CalDAV
  - 同步:**SuperSync(端到端加密,可自建)** / Dropbox / WebDAV
  - 插件系统 + 自定义主题;运行于 Linux/macOS/Windows/Android/iOS/浏览器
- **核心文件 / 目录结构**:`src/app/features/` 按功能切分目录,每个功能一个文件夹:`planner`、`schedule`、`boards`、`focus-mode`、`task-repeat-cfg`、`time-tracking`、`reminder`、`add-tasks-for-tomorrow`(今日收尾时安排明天)、`before-finish-day`(结束一天总结)、`archive`、`history` 等——**功能边界非常清晰,适合照抄这个组织方式**。
- **Issue 洞察**:
  - **`#10393 同步稳定化 tracker(122 条评论!)`**——同步是最难的子系统,连成熟项目也长期缠斗
  - `#6373 iOS 主屏小组件`、`#2034 按项目统计时间`、`#2312 Vikunja 集成`
  - 加解密/密码同步失败类 issue 反复出现 → 本地加密 + 多端同步是高风险区
- **有趣的细节**:仓库里同样有 `AGENTS.md`、`CLAUDE.md` 和 `ARCHITECTURE-DECISIONS.md`。

### 4. Nextcloud Calendar — 「不重复造轮子」的教科书

- **是什么**:Nextcloud 的日历前端,标准 CalDAV 日历。
- **核心功能**:多设备同步、**WebCal 订阅**(订阅外部日历)、邀请与会者 + 空闲/忙碌(free/busy)、提醒(浏览器 + 邮件)、搜索、**带截止日期的任务直接显示在日历上**、预约(booking)、附件。
- **最值得注意的一点**:README 明确说「我们没有重新发明轮子」,前端建立在三个库之上:
  - **FullCalendar**(周/日历视图渲染)
  - **ical.js**(RFC 5545 的 iCal 解析/生成)
  - **c-dav library**(CalDAV 协议)
- **Issue 洞察**:邀请函(iMip)投递、与会者更新失败是长期痛点;WebCal 认证、FullCalendar 槽位时长自适应、自定义分类都是用户反复提的需求 → **日历领域的边界问题(时区、全天事件、邀请协议)比 UI 本身更难**。

### 5. Focalboard — 一份「反面教材」+ 形态参考

- **是什么**:开源的 Trello/Notion/Asana 替代品,曾达 26.5k stars,如今 **README 顶部挂着「无人维护」警告**,官方正在寻找接手维护者。
- **值得参考的点**:
  - 提供两种发行形态:**Personal Desktop**(单用户桌面版)和 **Personal Server**(多用户服务器版)——证明「单机个人版」是成立的发布形态
  - 同一份数据在 看板 / 表格 / 日历 视图间切换(和 Vikunja 印证同一设计)
- **教训**:**star 数 ≠ 可持续性**。功能大而全(boards + notion 式文档 + 协作)导致战线过长,最终烂尾。对个人项目的启示:**把一个视图(7 天日程)做透,胜过做五个半成品视图**。

### 补充:微信小程序日历组件

- `treadpit/wx_calendar`(2.4k stars,2018–2023,已停更):经典小程序日历组件,文档完整。
- `lspriv/wx-calendar`(0.4k stars,TypeScript,2026 年仍在更新):更现代的实现。
- 启示:若最终选择**小程序**形态,日历 UI 不必从零写;但这些组件只解决「日历格子」的渲染,「7 天看板 + 拖拽」仍需自己实现。

## 三、结论 1:可以参考的地方

### 产品与交互设计

1. **视图与数据分离**(Vikunja / SP / Focalboard 三方一致):核心实体只有「任务/日程」一种,看板、列表、甘特图都只是它的视图。我们的「7 天看板」本质是**按日期分桶的看板视图**——列(每一天)应当由数据推导,**不要把列存进数据库**。
2. **「先收集,后排期」的两段式流程**(Super Productivity 的 Planner):配一个「待安排/收件箱」桶,想到什么先记下来,再拖到具体的某一天。这和「未来 7 天」视图天然互补。
3. **快速录入**(Vikunja 的 Quick Add Magic):输入「周五 交周报」自动解析日期,录入成本极低,实现成本也低(一个日期解析函数)。
4. **本地优先、无需账号**(Super Productivity):不需要注册登录、数据先存本地。这让 MVP 的复杂度大幅下降,也符合个人日程工具的隐私预期。
5. **不重复造轮子**(Nextcloud Calendar):Web 日历视图直接用 FullCalendar;iCal 解析/生成用 ical.js。日历 UI 和日期语义是出了名的坑(时区、跨天、全天事件、DST),成熟库已经踩平了。

### 数据模型

6. **Planka 的实体切分方式**值得照搬其「粒度」,但砍掉协作复杂度:容器(层级)→ 条目 → 关联(标签/成员)→ 附属(评论/附件)分开建表;拖拽排序用独立的 `position` 字段。
7. **任务自带截止日期 + 提醒 + 重复规则**(Vikunja):这三个字段是日程类应用和纯看板的核心差异,MVP 至少要预留 `date`(哪天)和 `remindAt`(可选)。

### 架构与工程

8. **API 优先**(Vikunja 的 OpenAPI / Planka 的 Swagger)直接解决「形式未定」的问题:**先做一套 API + 本地数据层,看板/APP/小程序都只是它的客户端**。形式后置,架构不返工。
9. **monorepo 布局**:Vikunja(`frontend/` + `pkg/`)、Planka(`client/` + `server/`)都是前后端同仓分离目录;Super Productivity 的 `features/` 按功能分目录,边界清晰。
10. **部署与运维**:Docker Compose 一键起全套(Planka);另外从 Planka 的 issue 看,通知(SMTP)和反向代理是自部署的重灾区,设计时要留好配置面。
11. **AI 协作规范**:Vikunja 和 Super Productivity 都在仓库里维护 `AGENTS.md`,和我们的做法一致。

## 四、结论 2:可以拓展的方向

按「用户呼声(来自各项目 Issue)+ 实现成本」排序,数字越小越值得先做:

| 优先级 | 方向 | 依据 | 说明 |
|---|---|---|---|
| ★★★ | **移动端 / 移动适配** | Planka `#19`(高赞请求) | 7 天视图天然适合手机竖屏;小程序本身就是移动端答案 |
| ★★★ | **重复日程**(每周例会、每月缴费) | Vikunja 内置;Planka 拿它当付费卖点 | 日程工具的高频刚需,建议早期跟进 |
| ★★☆ | **提醒 / 通知**(推送、邮件、微信服务通知) | Planka 大量 SMTP issue;Nextcloud 提醒体系 | 邮件 SMTP 有很多坑;小程序用微信订阅消息更顺 |
| ★★☆ | **日历互通**(CalDAV 订阅、iCal 导入导出、WebCal 节假日) | Vikunja 最热 issue;Nextcloud 核心能力 | 让用户把手头日历接进来,大幅提升粘性;ical.js 可复用 |
| ★★☆ | **公开分享只读看板** | Planka `#602` | 「把这周安排发给同事看」是自然场景 |
| ★☆☆ | **多端同步**(E2EE) | SP `#10393` 122 条评论的 tracker | **价值高但最难**,务必后置;可先做导出/导入文件 |
| ★☆☆ | **时间统计**(每天/每类事务耗时) | SP `#2034` | 有了记录就能做报表,锦上添花 |
| ★☆☆ | **专注模式**(番茄钟)、习惯打卡 | SP 内置 | 与日程强相关的增值模块 |
| ★☆☆ | **预约 booking**(生成可约时段链接) | Nextcloud appointments | 偏商业化方向,适合做成差异化 |
| ★☆☆ | **第三方任务导入**(滴答清单/Todoist/JSON) | Vikunja 的导入器 | 降低迁移成本,获客手段 |
| ☆☆☆ | 插件系统、自定义主题、桌面小组件、地图视图 | SP / Planka Pro | 远期 |

## 五、结论 3:MVP 阶段的核心骨架

### 核心假设(先验证它)

> 打开产品,**第一屏就是从今天起 7 天的日程看板**,日程卡片可以在天与天之间拖拽,未定日期的先放「待安排」桶。

一切骨架围绕这个假设搭建,不做任何「协作」。

### 1)数据模型(最小集)

```
ScheduleItem(日程条目)
  id            UUID
  title         标题
  notes?        备注(Markdown 可后置)
  date          归属日期(本地时区的 YYYY-MM-DD,null = 待安排桶)
  startAt?/endAt?  可选的起止时刻(全天事件则留空)
  isAllDay?     是否全天
  status        todo / done
  labelId?      颜色标签(可选,先只做颜色不做标签实体)
  position      桶内排序值(拖拽用,如分数排序 fractional indexing)
  remindAt?     提醒时刻(可后置)
  createdAt / updatedAt
```

要点:
- **「列」不落库**:7 天列 + 「待安排」列全部由 `date` 推导,换一种视图零迁移。
- 拖拽排序参考 Planka 用独立 `position` 字段(推荐 fractional indexing,避免频繁重排)。
- **第一天就定死日期语义**:本地时区、跨天事件、全天事件的边界(Nextcloud/ical.js 的教训),并在测试里覆盖。

### 2)API(REST + OpenAPI 文档,参考 Vikunja)

```
POST   /items                 新建(快速录入含自然语言日期解析可选)
GET    /items?from=today&days=7   取 7 天看板数据(按桶返回)
PATCH  /items/:id             修改任意字段
DELETE /items/:id             删除
POST   /items/:id/move        跨天移动 / 桶内排序 {date, position}
PATCH  /items/:id/status      完成勾选
```

### 3)客户端形态(解「形式未定」)

- **推荐:Web 先行**(迭代最快、最易分享演示),但选可同时编译到小程序的技术:**Taro / uni-app**(一套代码 → H5 + 微信小程序);若走纯 Web,则 React/Vue 任一 + `dnd-kit`(拖拽)或 FullCalendar(周视图)。
- 小程序路线的日历渲染可参考 `lspriv/wx-calendar`(TS、活跃),但 7 天看板列建议自绘(CSS Grid + 触摸拖拽)。
- **数据层先本地**:Web 用 IndexedDB(如 Dexie)或 SQLite;小程序用本地 storage。接口先抽象成 Repository 层,给将来加后端/同步留缝。

### 4)仓库骨架

```
/ (monorepo)
├── AGENTS.md          ✅ 已有
├── docs/              prior-art.md 等调研文档
├── packages/
│   ├── core/          领域模型 + 日期分桶/排序逻辑(纯函数,单测重点)
│   ├── server/        API(如 MVP 只做本地,可延后)
│   └── app/           前端(按 features/ 目录切分,参考 Super Productivity)
├── docker-compose.yml
└── .github/workflows/ CI:跑全部测试
```

### 5)测试基线(MVP 就要有)

- `core` 包单测:日期分桶(今天/明天/跨周/月末)、时区与全天事件、position 排序与插入。
- API 集成测试:CRUD + move 的行为契约。
- 一条端到端冒烟:新建 → 拖到后天 → 勾选完成。

### 6)MVP 明确不做(写下来防止蔓延)

多用户与协作、实时同步(Sync/WebSocket)、邮件/推送通知、CalDAV、第三方集成、插件、甘特图、统计报表。这些全部列入「拓展方向」按需跟进。

## 六、参考链接

- Vikunja:https://github.com/go-vikunja/vikunja | 功能页 https://vikunja.io/features/
- Planka:https://github.com/plankanban/planka | 数据模型 `server/api/models/`
- Super Productivity:https://github.com/johannesjo/super-productivity | 功能目录 `src/app/features/`
- Nextcloud Calendar:https://github.com/nextcloud/calendar
- Focalboard:https://github.com/mattermost/focalboard(停止维护)
- 小程序日历组件:https://github.com/treadpit/wx_calendar | https://github.com/lspriv/wx-calendar
- 关键 Issue:Planka `#19`(移动端)、`#602`(公开看板);Super Productivity `#10393`(同步 tracker)、`#6373`(iOS 小组件);Vikunja `#26`(CalDAV 客户端)
