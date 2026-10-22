# PAYBEAT 当前 UI → Figma 交接数据

版本：2026-10-21  
对应工具：`按秒计费工具/index.html`、`按秒计费工具/pay-by-second.html`  
独立实验版：`按秒计费工具/pay-by-second-readymag.html`

这份文档把当前网页已经使用的画板尺寸、布局、间距、颜色、字号、组件、状态和数据字段整理出来，后续可以直接按它在 Figma 重建。当前主入口的最终渲染样式是“浅灰底 + 黑色编辑排版 + 荧光黄主色”的 Editorial 版本；文件前半段仍保留了深色基础 Token，但后面的 Editorial 样式覆盖了它们，Figma 应以本交接文档里的最终 Token 为准。

## 1. 页面入口与设计范围

| 页面 | 用途 | Figma 建议 |
| --- | --- | --- |
| `index.html` | 经典主入口 | 主设计基准 |
| `pay-by-second.html` | 按秒计费主工具副本 | 与 `index.html` 保持同一组件和数据 |
| `pay-by-second-readymag.html` | Readymag / Motion Study 实验版 | 独立探索页，不作为主入口基准 |
| `index.html?popup=1` | 桌面小窗 | 单独做 Popup 画板 |

## 2. 主入口画板与网格

### Desktop 基准

建议建立 `1440 × 900 px` 画板，并保留一个 `1600 × 1000 px` 检查画板。

- 页面内容宽度：`min(1280 px, viewport - 48 px)`。
- 1440 画板中，左右外边距为 `24 px`；内容最大宽度为 `1280 px`。
- 页面顶部 padding：`24 px`；底部 padding：`56 px`。
- 顶部栏下边框与底部内边距：`padding-bottom 14 px`。
- 顶部栏到标题区的间距：`30 px`。
- 标题区底部 padding：`18 px`，并带 `1 px` 黑色分割线。
- 标题区到主布局的间距：`20 px`。
- 主布局为两列：`1.8fr / 0.72fr`，列间距 `22 px`。
- 以 `1280 px` 内容宽度计算，左侧主卡约 `865 px`，右侧栏约 `347 px`。
- 右侧栏两卡之间的间距：`22 px`。

### Mobile 基准

建议建立 `390 × 844 px`、`375 × 812 px` 两个画板。

- `≤780 px`：页面内容宽度为 `100% - 28 px`，最大宽度 `620 px`；顶部 padding `22 px`；底部 padding `110 px`，为固定操作栏留空间。
- 主布局改为单列，主卡和侧栏宽度 `100%`。
- 主计时卡最小高度 `475 px`。
- 底部操作栏固定在 viewport 底部，左右 padding `14 px`，背景带约 `0.94` 透明度和 `16 px` 模糊；按钮最小高度 `50 px`。
- `≤430 px`：主卡 padding `20 px`，圆角 `20 px`；计时区域上下 padding `64 / 38 px`；计时字号 `54–78 px`；金额字号 `39 px`；指标间距 `14 px`。
- 手机上所有金额、时间和单价使用等宽数字（`tabular-nums`）。

### Desktop Popup

- 推荐画板：`360 × 500 px`，可再补 `430 × 820 px` 浏览器窗口检查尺寸。
- 内容最大宽度 `360 px`，左右外边距 `14 px`。
- 隐藏品牌、标题、隐私说明、设置摘要和历史卡，只保留计时主卡。
- 主卡 padding `18 px`，圆角 `16 px`，最小高度取消。
- Popup 计时字号 `48–72 px`，金额字号 `42–62 px`。
- Popup 按钮高度 `40 px`，字号约 `12 px`。

## 3. 主入口最终视觉 Token

以下是 `index.html` / `pay-by-second.html` 最终 Editorial 样式实际覆盖后的值。

| Token | 值 | 用途 |
| --- | --- | --- |
| Background | `#E9E8E3` | 页面背景 |
| Background soft | `#F7F6F1` | 卡片与输入背景 |
| Panel | `#F7F6F1` | 所有主卡背景 |
| Panel strong | `#111111` | 黑色按钮、标题、强对比面 |
| Text | `#111111` | 主文字 |
| Muted | `#5F5F5B` | 辅助文字、字段说明 |
| Muted secondary | `#777772` | 历史日期、弱提示 |
| Line | `#171717` | 边框、分割线 |
| Accent | `#D7FF00` | 主按钮、收入卡、选中状态 |
| Accent deep | `#B8DA00` | 复选与控件强调 |
| Accent soft | `rgba(215,255,0,.24)` | 弱高亮 |
| Paused orange | `#F2C46B` / 文字 `#8D4D00` | 暂停状态 |
| Danger | `#AA1C18` | 重置、清空、危险动作 |
| Card shadow | `7px 7px 0 rgba(17,17,17,.14)` | 卡片默认阴影 |
| Main shadow | `10px 10px 0 #111111` | 主计时卡阴影 |

基础字体：`Arial`、`Helvetica Neue`、系统无衬线。中文使用系统中文字体回退。当前视觉强调硬朗编辑排版，不使用圆角卡片体系；主入口卡片圆角为 `0`，移动端主计时卡在 `≤430 px` 时为 `20 px`。

## 4. 页面结构与对齐

```text
AppShell
├─ Topbar
│  ├─ BrandMark 34×34
│  ├─ PAYBEAT / Every second counts.
│  └─ 本机隐私提示
├─ Intro
│  ├─ 页面标题：工资跳动
│  ├─ 说明文案
│  └─ SessionState 状态胶囊
├─ MainGrid
│  ├─ TimerPanel
│  │  ├─ Eyebrow：LIVE PAY / TODAY
│  │  ├─ Timer：00:00:00
│  │  ├─ EarnStage：今日收入、实时状态、每秒增加
│  │  ├─ LiveRegion：辅助状态说明
│  │  ├─ Metrics：每秒单价、本月工作日
│  │  └─ Controls：主操作、结束并结算、重置
│  └─ SideColumn
│     ├─ SettingsSummary：计薪设置
│     └─ HistoryPanel：最近结算
└─ SettingsDialog
   ├─ 月薪
   ├─ 结算月份
   ├─ 货币
   ├─ 工作日
   ├─ 上下班时间
   ├─ 午休时间
   ├─ 自动开始
   ├─ 规则预览
   ├─ 隐私说明
   └─ 取消 / 保存并开始计费
```

对齐规则：

- Topbar、标题区、主布局共用同一内容左右边缘。
- 主计时卡是第一视觉锚点；右栏只承载设置和历史。
- TimerPanel 内部从上到下依次为标签、计时、收入、辅助状态、指标、操作。
- 所有数字使用右对齐或等宽数字，避免秒级更新造成布局抖动。
- SettingsSummary 与 HistoryPanel 的标题、边框和右上角编号对齐。

## 5. 主入口组件规格

### BrandMark / Topbar

- BrandMark：`34 × 34 px`，主入口为方形，背景 `#111111`，文字 `p/` 使用 `#D7FF00`。
- Brand 与文字间距：`10 px`。
- `PAYBEAT` 字号 `14 px`，字距约 `.18em`，字重 `800`。
- `Every second counts.` 字号约 `11 px`，字距 `.16em`。
- 隐私提示字号 `12 px`，圆点为 `7 × 7 px`。

### Intro / SessionState

- H1 字号响应范围 `44–86 px`，字重 `800`，字距约 `-.085em`，行高 `.86`。
- 说明文字字号 `13 px`，与标题间距 `15 px`。
- 标题区为 flex 横向布局；移动端改为纵向。
- SessionState 高度约 `34 px`，圆角 `999 px`，边框 `1 px`，内边距 `8 px 12 px`。
- 状态胶囊文字大写、字距约 `.08em`。

### TimerPanel

- Desktop 最小高度：`590 px`。
- Desktop padding：`clamp(24 px, 4vw, 46 px)`。
- 边框 `1 px #171717`，无圆角，背景 `#F7F6F1`。
- 主阴影：`10 px 10 px 0 #111111`。
- 背景网格：约 `32 × 32 px` 的低透明度线格。
- 右下角装饰数字 `01`，低透明度，建议作为独立装饰层。

### Timer

- Desktop 字号：`clamp(76 px, 13vw, 178 px)`。
- 字重 `800`，字距约 `-.055em`，行高 `.95`。
- 冒号颜色为 `#777772`，字号约主数字的 `48%`。
- 移动端 `≤430 px` 使用 `54–78 px`。
- 默认显示：`00:00:00`。

### EarnStage

- Desktop 上方间距 `34 px`，内边距 `24 px 26 px 21 px`。
- 背景 `#D7FF00`，边框 `1 px #171717`，无圆角。
- 标题行左右分布，标签字号约 `13 px`，状态字号约 `11 px`。
- 金额字号：`clamp(62 px, 10vw, 122 px)`，字重 `800`，字距约 `-.05em`。
- 货币符号字号约金额的 `52%`。
- “每秒增加”字号 `12 px`；数值字号 `15 px`，字重 `650`。
- 计费中金额有轻微 `steps(2)` 跳动动画；需要在 Figma 中做静止、增长和减少动画三个状态稿。

### Metrics / Controls

- Metrics 顶部有 `1 px` 分割线，顶部 padding `24 px`，指标间距 `26 px`。
- 指标标签字号 `10 px`，大写，字距约 `.08em`。
- 指标数值字号 `16 px`，字重 `700`；单位字号约 `11 px`。
- Controls 与指标区间距 `34 px`，按钮最小高度 `48 px`，按钮间距 `10 px`。
- 主按钮：黑底 `#111111`、荧光黄文字 `#D7FF00`。
- 次按钮：透明底、黑边。
- 危险按钮：文字和边框 `#AA1C18`。

### SettingsSummary

- 内边距 `24 px`，阴影 `5px 5px 0 rgba(17,17,17,.12)`。
- 标题区底部边框，padding-bottom `14 px`，标题区下方间距 `20 px`。
- 右上角装饰编号 `02`，字号 `42 px`，透明度约 `.12`。
- 月薪金额字号 `33 px`，字重 `800`。
- 摘要行上下外边距约 `19 / 20 px`。
- 工作时段条上下 padding `13 px`，上下边框 `1 px`。
- 主按钮宽度 `100%`，按钮之间间距约 `8 px`。

### HistoryPanel

- 与 SettingsSummary 相同的 `24 px` 内边距和卡片阴影。
- 右上角编号 `03`，字号 `42 px`，透明度约 `.12`。
- 每条历史记录上下 padding `13 px`，顶部 `1 px` 分割线。
- 金额字号 `15 px`，日期字号 `11 px`，时长字号 `12 px`。
- 空状态文案：`还没有结算记录。每天结束后会自动记录当天金额。`
- 清空按钮字号 `11 px`，大写，危险状态使用 `#AA1C18`。

### SettingsDialog

- Desktop 宽度 `460 px`，最大高度 `viewport - 24 px`，溢出滚动。
- 移动端宽度 `calc(100% - 28 px)`。
- 主入口对话框无圆角，边框 `1 px #171717`，阴影 `10px 10px 0 #111111`。
- Dialog 内边距 `24 px`。
- 标题字号 `21 px`，字重 `800`；字段标签字号 `12 px`。
- 字段间距 `16 px`；双列时间字段间距 `12 px`。
- 输入框和选择框高度 `46 px`，边框 `1 px`，无圆角，左右内边距 `13 px`。
- 工作日选择器七等分，单项最小高度 `38 px`，间距 `6 px`。
- 规则预览卡上方间距 `18 px`，内边距 `14 px`，荧光黄底。
- 对话框底部按钮高度 `46 px`，按钮间距 `10 px`。

## 6. Readymag / Motion Study 实验版规格

`pay-by-second-readymag.html` 是独立的创意版，使用黑底、荧光黄、橙色阴影和硬朗大字。它复用同一套字段和计费状态，但不要把它的装饰直接混入 Editorial 主入口。

### Desktop

- 页面内容宽度：`min(1500 px, viewport - 52 px)`；顶部 padding `26 px`，底部 padding `70 px`。
- 顶部栏下边框，底部 padding `18 px`；顶部栏到标题区间距 `34 px`。
- 标题区最小高度 `300 px`，底部 padding `28 px`，标题区底部有 `1 px` 分割线。
- 主布局列比例 `2.1fr / .75fr`，列间距 `28 px`。
- 左侧 TimerPanel 最小高度 `690 px`，内边距 `clamp(26 px, 4.5vw, 64 px)`，右下荧光黄偏移阴影 `18 px`。
- 右栏 sticky，顶部偏移 `24 px`；设置卡和历史卡间距 `28 px`，内边距 `26 px`。
- 主标题字号 `clamp(72 px, 15vw, 220 px)`；主计时字号 `clamp(82 px, 14vw, 212 px)`；金额字号 `clamp(74 px, 11vw, 144 px)`。
- 计时区域 padding `112 px 0 66 px`；收入卡上方间距 `46 px`，内边距 `28 px 30 px 25 px`，向左旋转 `1.2°`，橙色偏移阴影 `11 px`。
- 实验版按钮高度 `50 px`，胶囊圆角 `999 px`；主按钮荧光黄底。

### Mobile

- `≤780 px`：内容宽度 `100% - 28 px`，标题区最小高度 `260 px`，主卡最小高度 `590 px`，主卡阴影偏移 `9 px`。
- `≤430 px`：内容宽度 `100% - 20 px`，顶部 padding `16 px`；主标题字号 `20vw`；主卡 padding `20 px`；计时区 padding `86 px 0 48 px`；计时字号 `58–86 px`；金额字号 `48–70 px`。
- 移动端右栏取消 sticky，底部操作栏仍沿用固定操作栏结构。

### Readymag Token

| Token | 值 |
| --- | --- |
| Background | `#070707` |
| Panel | `rgba(18,18,18,.84)` |
| Text | `#F3F1E9` |
| Muted | `#AAA79F` |
| Line | `rgba(243,241,233,.35)` |
| Accent | `#E9FF35` |
| Orange shadow | `#FF5A3C` |
| Danger | `#FF6955` |
| Display font | `Impact / Haettenschweiler / Arial Narrow Bold` |
| Body font | `Arial / Helvetica Neue` |

## 7. 交互状态与 Figma 状态稿

建议在 Figma 的 `05 States` 页面至少建立以下状态：

| 状态 | 状态胶囊 | 主按钮 | 金额区文案 | 备注 |
| --- | --- | --- | --- | --- |
| 未设置 | 等待设置 / 还没开始 | 先完成设置 | 等待开始 | 首次打开自动弹出设置 |
| 已设置待开始 | 准备开始 | 开始今天 | 等待开始 | 今天不是工作日时按钮禁用 |
| 上午计费 | 自动计时中 | 暂停今天 | 收入正在增加 | 金额每秒更新 |
| 午休 | 休息中 | 暂停今天 | 休息中暂停增加 | 计时与金额暂停增加 |
| 手动暂停 | 今日已暂停 | 继续今天 | 今日已暂停 | 可继续或结束结算 |
| 已结算 | 今日已结算 | 今日已结算（禁用） | 今日收入已结算 | 写入历史 |
| 空历史 | — | — | — | 显示空状态提示 |
| 设置编辑中 | — | — | — | 预览卡实时更新 |
| 清空本机数据确认 | — | — | — | 删除设置、当天计时、历史后重新加载 |

按钮禁用态：透明度约 `.42`，鼠标不显示可点击反馈。焦点态：`3 px` 荧光黄外轮廓，偏移 `3 px`。

## 8. 默认数据与业务字段

首次打开默认填充，但在用户点击保存前不写入本机：

```json
{
  "monthlySalary": "10000",
  "monthKey": "当前月份 YYYY-MM",
  "currency": "¥",
  "workdays": [1, 2, 3, 4, 5],
  "workStart": "10:00",
  "workEnd": "18:00",
  "breakStart": "12:00",
  "breakEnd": "13:30",
  "autoStart": true
}
```

实际可计费时段为 `10:00–12:00` 与 `13:30–18:00`，合计 `6 小时 30 分钟/工作日`。每秒单价按下式计算：

```text
本月计划计费秒数 = 本月选中工作日数量 × 每日可计费秒数
每秒单价 = 月薪 ÷ 本月计划计费秒数
今日收入 = 今日实际计费秒数 × 每秒单价
```

主要运行字段：

| 字段 | 类型 | 用途 |
| --- | --- | --- |
| `status` | `idle / running / paused / done` | 当前状态 |
| `profileComplete` | boolean | 是否已保存规则 |
| `accumulatedMs` | number | 今日已累计计费毫秒 |
| `startedAt` | number/null | 当前计费段开始时间戳 |
| `sessionDate` | `YYYY-MM-DD` | 当前计费日期 |
| `settledAmount` | number/null | 当日结算金额 |
| `history` | array | 最近最多 31 条日结记录 |
| `pendingSettings` | object/null | 修改中的待应用规则 |
| `autoPaused` | boolean | 是否因暂停或自动状态停止 |
| `dayRecorded` | boolean | 当天是否已写入历史 |

历史项字段：`amount`、`currency`、`month`、`duration`、`date`。

## 9. 本机隐私与数据隔离实现

当前版本使用浏览器 `localStorage`，数据只存在当前浏览器的当前网站来源中：

- 不使用服务器数据库、登录账号、云同步或外部 API。
- 页面没有读取 `fetch`、XHR 或 WebSocket；`pay-server.js` 只提供静态文件。
- 主入口和实验版按页面路径生成独立的本机存储命名空间：`paybeat-local-state-v8:<页面路径>`。
- 旧版本的 `paybeat-classic-state-v6-private` 与 `paybeat-experiment-state-v4-private` 不再读取，因此旧设置不会被新版本自动带入。
- 设置弹窗内增加“清除本机数据，重新开始”，会删除 PayBeat 本机设置、当天计时和历史并重新加载空白页面。
- 同一台手机如果由不同人共用同一个浏览器，浏览器无法识别使用者；交接给下一位使用者前应点击清除本机数据，或使用不同浏览器/浏览器用户配置文件。

这意味着每个人在自己的手机和浏览器中打开时，都会拥有独立数据；工资、计时和历史不会通过链接传给其他人。

## 10. Figma 文件建议结构

1. `00 Foundations`：颜色、字体、边框、阴影、数字样式。
2. `01 Desktop / Editorial`：`1440 × 900` 主入口。
3. `02 Mobile / Editorial`：`390 × 844`、`375 × 812`。
4. `03 Settings Dialog`：首次设置、编辑规则、错误校验、清除数据确认。
5. `04 Popup`：`360 × 500` 与 `430 × 820`。
6. `05 States`：未设置、待开始、计费、午休、暂停、结算、空历史。
7. `06 Data & Copy`：字段、默认值、中文文案和金额格式。
8. `99 Readymag Experiment`：独立实验版，不覆盖主入口组件。

组件命名建议：

- `PAYBEAT / BrandMark`
- `PAYBEAT / Topbar`
- `PAYBEAT / SessionState`
- `PAYBEAT / TimerPanel`
- `PAYBEAT / EarnStage`
- `PAYBEAT / Metric`
- `PAYBEAT / Controls`
- `PAYBEAT / SettingsSummary`
- `PAYBEAT / HistoryPanel`
- `PAYBEAT / HistoryItem`
- `PAYBEAT / SettingsDialog`
- `PAYBEAT / WeekdayPicker`
- `PAYBEAT / SchedulePreview`
- `PAYBEAT / PrivacyNotice`

## 11. 交接检查清单

- 主入口是否以 `1440 × 900` 为基准完成布局。
- 桌面主网格是否保持 `1.8fr / .72fr` 和 `22 px` 列间距。
- 移动端是否切换单列并为底部固定操作栏预留 `110 px`。
- Timer、金额和每秒单价是否使用等宽数字。
- 未设置、计费、午休、暂停和结算状态是否都有独立稿。
- 设置弹窗是否包含默认值、规则预览和清除本机数据入口。
- Figma 中是否区分主入口 Editorial 版与 Readymag 实验版。
- 文案和字段是否与第 7 节保持一致。
