# PAYBEAT v1 UI 规格与 Figma 交接

这份文档对应当前 GitHub Pages 的经典版第一版。创意 Readymag 版继续作为独立实验页，不作为下一轮 Figma 重设计的基准。

## 1. 页面目标与入口

- 产品名称：工资跳动 / PAYBEAT
- 默认入口：`index.html`
- 低调小窗：`index.html?popup=1`
- 创意实验：`pay-by-second-readymag.html`
- 当前在线地址：<https://zeldovichmok-alt.github.io/paybeat/>
- 小窗地址：<https://zeldovichmok-alt.github.io/paybeat/?popup=1>

首次打开时先展示“开始前，先设置工资规则”弹窗。月薪、工作时间、工作日和午休只是预填基准，用户点击“保存并开始计费”后才会写入本机并开始计时。

## 2. 画板与响应式尺寸

### Desktop 基准画板

建议在 Figma 使用 `1440 × 900 px` 作为基准画板，页面内容最大宽度为 `1120 px`，水平居中，左右至少保留 `40 px` 外边距。

| 区域 | 尺寸 / 规则 |
| --- | --- |
| 页面内容 `.shell` | max-width `1120 px`；顶部 padding `32 px`；底部 `48 px` |
| 顶部栏 | 高度约 `36 px`；下方间距 `30 px` |
| 页面标题区 | 下方间距 `20 px` |
| 主布局 | 两列 `1.55fr / .85fr`；列间距 `16 px` |
| 左侧计时卡 | 约 `714 px` 宽；min-height `510 px`；内边距 `38 px` |
| 右侧栏 | 约 `390 px` 宽；设置卡与历史卡间距 `16 px` |
| 卡片圆角 | 计时卡及侧栏卡 `24 px` |
| 按钮高度 | 默认 `46 px` |
| 弹窗 | 宽度 `min(460 px, viewport - 28 px)`；最大高度 `viewport - 24 px` |

### Mobile 基准画板

建议补充 `390 × 844 px` 和 `375 × 812 px` 两个 Figma 画板。

- 页面内容宽度：`100% - 28 px`，左右各 `14 px`
- 页面顶部 padding：`22 px`
- 主布局改为单列
- 计时卡 min-height：`475 px`
- 底部操作栏固定，左右 padding `14 px`，底部安全区域建议额外留 `16 px`
- 计时卡内边距：`20 px`
- 时间和金额数字使用 `tabular-nums`
- 390 px 以下时，控制按钮允许三列缩短显示

### Desktop 小窗

小窗只显示计时和金额，隐藏顶部品牌、标题、设置摘要和历史记录。

- 推荐窗口：`360 × 500 px`
- 内容宽度：`min(100% - 28 px, 360 px)`
- 计时卡内边距：`18 px`
- 计时卡圆角：`16 px`
- 时间字号范围：`48–72 px`
- 金额字号范围：`42–62 px`

## 3. Layout 对齐关系

- 所有主卡片左边缘与页面内容网格对齐。
- 左侧主计时卡是视觉主锚点，右侧设置与历史为信息侧栏。
- 顶部品牌左对齐，隐私说明右对齐。
- 标题区左侧为产品标题和说明，右侧为计费状态胶囊。
- 计时卡内部顺序：`LIVE PAY / TODAY` → 计时器 → 今日收入 → 辅助状态 → 指标 → 操作按钮。
- 侧栏顺序：计薪设置 → 最近结算。
- 金额、计时和每秒单价都使用等宽数字或 `tabular-nums`，避免跳动时宽度变化。

## 4. 当前视觉 Tokens

```text
Background        #090D18
Background soft   #101728
Panel             rgba(20, 28, 46, 0.84)
Panel strong      #162039
Text              #F4F6FB
Muted             #9DA8C0
Muted secondary   #68758F
Line              rgba(185, 199, 231, 0.14)
Accent / lime     #B8F36B
Accent deep       #83CF41
Accent soft       rgba(184, 243, 107, 0.12)
Orange / paused   #FFB260
Danger            #FF8178
Shadow            0 24px 70px rgba(0, 0, 0, 0.28)
```

字体优先级：`Inter` → `ui-sans-serif` → `system-ui` → `-apple-system` → 中文系统字体。页面基础字距约 `0.01em`。

## 5. 字体层级

| Token | 当前用途 | Desktop | Mobile |
| --- | --- | ---: | ---: |
| Display timer | 主计时器 | `62–126 px` | `54–78 px` |
| Display money | 今日收入 | `54–88 px` | `39 px` |
| Page title | 工资跳动 | `30–52 px` | `44–86 px`（响应式） |
| Dialog title | 设置标题 | `21 px` | `21 px` |
| Section title | 侧栏标题 | `14 px` | `14 px` |
| Body | 说明文字 | `14 px` | `14 px` |
| Caption | 标签、历史辅助信息 | `11–12 px` | `11–12 px` |
| Button | 按钮文字 | 系统字体，约 `14 px` | 约 `13–14 px` |

数字建议使用 `font-variant-numeric: tabular-nums`；主计时器当前字距约 `-0.09em`，金额约 `-0.08em`。

## 6. 组件清单

### `BrandMark`

- 尺寸 `36 × 36 px`
- 圆角 `12 px`
- 内容：`p/`
- 背景 Accent，深色文字

### `SessionState`

- 胶囊高度约 `32 px`
- 左侧状态圆点 `7 px`
- 状态：等待设置、准备开始、自动计时中、休息中、今日已暂停、今日已结算

### `TimerPanel`

- 主卡片，包含实时计费主视觉
- 计时器支持 `00:00:00`
- 今日收入支持货币符号与两位小数
- “每秒增加”显示四位小数

### `SettingsSummary`

- 显示月薪、结算月份、本月工作日、每日计费时段
- 主按钮：编辑工资规则
- 次按钮：在电脑弹窗打开
- 规则修改后显示即时生效提示

### `HistoryPanel`

- 每日独立记录
- 每行：金额、月份与日期、累计时长
- 支持清空记录

### `SettingsDialog`

字段顺序：

1. 月薪
2. 结算月份
3. 货币
4. 工作日选择（周一至周日）
5. 上班时间 / 下班时间
6. 午休开始 / 午休结束
7. 工作日自动开始
8. 规则预览
9. 取消 / 保存并开始计费

## 7. 默认数据与状态

首次打开预填：

```json
{
  "monthlySalary": "10000",
  "currency": "¥",
  "workdays": [1, 2, 3, 4, 5],
  "workStart": "10:00",
  "workEnd": "18:00",
  "breakStart": "12:00",
  "breakEnd": "13:30",
  "autoStart": true
}
```

状态流程：

```text
首次打开
  → 设置弹窗
  → 保存并开始计费
  → 准备开始 / 自动计时中
  → 午休中（暂停增加）
  → 今日已暂停 / 继续今天
  → 今日已结算
```

保存规则时：

- 未开始计费：应用设置并开始当前工作日计费。
- 正在计费或暂停：设置立即应用；当前累计时间保留；当天金额按新薪资和新工作时段重新计算。
- 日期变化：结束上一天并创建新的当天 session。

## 8. 本地隐私与数据隔离

- 不使用服务器数据库，不向 GitHub 上传用户设置。
- 每个页面只读取自己的版本存储键：经典版 `second-pay-state-v5-onboarding`，创意版 `paybeat-readymag-state-v3-onboarding`。
- 已移除旧版本 `LEGACY_KEY` 迁移读取；新版本不会继承旧页面的工资、历史或计时状态。
- 设置、当天 session 和历史只存在用户当前浏览器/设备的 `localStorage` 中。
- 不同用户、不同浏览器、不同设备互不共享设置。
- GitHub Pages URL 不携带工资、时间或历史参数；分享链接只分享空白应用页面。
- 清除浏览器站点数据会删除该设备上的本地设置和历史。

## 9. Figma 建议页面结构

建议建立以下页面：

1. `00 Foundations`：颜色、字体、间距、圆角、阴影、数字样式
2. `01 Desktop / Classic`：`1440 × 900`
3. `02 Mobile / Classic`：`390 × 844`、`375 × 812`
4. `03 Settings Dialog`：首次设置、编辑中、即时生效提示
5. `04 Popup`：`360 × 500`
6. `05 States`：等待、计时、午休、暂停、结算、空历史
7. `99 Readymag Experiment`：保留当前创意版，独立迭代

组件命名建议：`PAYBEAT / TimerPanel`、`PAYBEAT / SettingsSummary`、`PAYBEAT / SettingsDialog`、`PAYBEAT / SessionState`、`PAYBEAT / HistoryItem`。
