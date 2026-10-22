# 按时薪酬产品架构

## 1. 产品定位

这是一个“按实际工作时间估算收入”的工具。产品需要同时区分：

- **计费收入**：按工作时间计算的毛收入或用户选择的计费口径。
- **到手估算**：扣除个人社保、公积金和预估税费后的金额。
- **雇主成本**：毛收入加上雇主承担的社保、公积金等费用。

社保、公积金和个税比例不能写死。它们应由用户按地区、年度和工资基数配置，页面明确标注“估算值”。

## 2. 可内置的一组工作人群预设

预设只用于快速填充，用户套用后仍然可以编辑。

| 预设 | 工作时间 | 休息 | 示例薪资 | 适合人群 |
| --- | --- | --- | --- | --- |
| 标准双休 | 周一至周五 09:00–12:00、13:30–18:30 | 12:00–13:30 | ¥11,200/月 | 普通白领 |
| 朝九晚五 | 周一至周五 09:00–12:00、13:00–17:00 | 12:00–13:00 | ¥8,000/月 | 行政、客服 |
| 早班 | 周一至周五 08:00–12:00、13:00–17:00 | 12:00–13:00 | ¥9,000/月 | 教育、运营 |
| 晚班 | 周一至周五 10:00–13:00、14:00–19:00 | 13:00–14:00 | ¥12,000/月 | 内容、设计 |
| 单休 | 周一至周六 09:00–12:00、13:30–18:00 | 12:00–13:30 | ¥10,000/月 | 门店、销售 |
| 两班倒 | 08:00–20:00 或 20:00–次日 08:00 | 按班次配置 | ¥6,500/月 | 制造、值班 |
| 弹性/提成 | 工作日和时段自定义 | 自定义 | ¥15,000/月起 | 销售、顾问 |
| 小时工/自由职业 | 日期和时段自定义 | 自定义 | ¥300/小时 | 兼职、自由职业 |
| 海外远程 | 当地时区周一至周五 09:00–17:00 | 自定义 | $4,000/月 | 海外远程 |

夜班和轮班应作为第二阶段能力；数据模型现在就预留跨日时段。

## 3. 核心配置模型

```text
Profile
  id, name, timezone, locale, currency
  scheduleId, payRuleId, deductionRuleId, holidayCalendarId

WorkSchedule
  weekdays: [1..7]
  intervals: [{ start, end, billable }]
  breaks: [{ start, end, paid }]
  holidayPolicy: weekend_only | regional | custom
  holidayOverrides: { date: work | off }
  rounding: exact_second | minute

PayRule
  mode: monthly | annual | daily | hourly
  amount, currency
  salaryType: gross | net
  monthlyBasis: actual_workdays | standard_days | standard_hours
  standardDays, standardHours
  allowances: [{ name, amount, type, taxable, countInRate }]
  overtime: [{ name, multiplier, enabled }]

DeductionRule
  enabled, region, year
  items: [{ key, enabled, base, baseValue, minBase, maxBase,
            employeeRate, employerRate, employeeFixed, employerFixed }]
  tax: { enabled, mode, monthlyTax, brackets, specialDeductions }

DailyLedger
  date, timezone, profileVersion
  scheduledMs, billableMs
  grossEarned, employeeDeductions, taxEstimate
  netEstimate, employerCost, currency
  status: idle | running | paused | done
```

## 4. 计费规则

### 月薪

```text
每秒单价 = 本月计费收入 ÷ 本月计划计费总秒数
今日毛收入 = 今日实际计费秒数 × 每秒单价
```

本月计划计费总秒数默认按当月实际工作日计算，也可以让用户选择标准 21.75 天或标准月工时。

### 到手和雇主成本

```text
个人扣款 = 个人社保 + 个人公积金
税前应税收入 = 毛收入 - 个人扣款 - 专项扣除
到手估算 = 毛收入 - 个人扣款 - 预估个税
雇主成本 = 毛收入 + 雇主社保 + 雇主公积金
```

社保、公积金按月核算更符合实际。日卡可以显示“当日按比例估算”，月底再按完整月规则结算。

## 5. 新版 UI

### 首页

顶部显示当前工作档案，例如“标准全职 · 上海 · CNY”。支持切换多个档案。

主计时卡显示：

1. 今日已计费时长
2. 今日毛收入
3. 到手估算
4. 每小时、每分钟、每秒单价

下方显示本月预计：工作日、计划工时、毛收入、个人扣款、到手估算、雇主成本。

### 设置弹窗或抽屉

采用“快速设置 + 高级规则”两层结构：

1. **快速设置**：档案名、地区/时区、货币、月薪、预设工作制度。
2. **工作时间**：周一至周日开关；每一天可添加多个工作时段；每个时段可设置是否计费。
3. **休息与节假日**：午休、茶歇、周末规则、节假日和调休日期。
4. **薪资口径**：月薪/年薪/日薪/时薪，税前或到手，标准月工时，加班倍率，津贴和提成。
5. **社保公积金**：默认关闭；打开后分别设置个人承担和雇主承担、基数、上下限、比例或固定金额。
6. **个税估算**：预计月税额或自定义税率档；文案必须写“仅供估算，不作为申报依据”。
7. **提醒与显示**：09:00 开始、午休、18:30 结算提醒；主卡显示毛收入或到手估算。

手机端使用分步页面和折叠卡片，桌面端使用两列弹窗；不要在首屏直接展示复杂社保比例。

## 6. 当前网页版本的迁移方式

当前单个 `state` 应迁移为：

```text
profiles: []
activeProfileId: string
dailyLedger: []
settingsVersion: 4
```

迁移规则：

- 旧数据自动生成一个“我的工作档案”。
- 旧月薪、工作时段、货币和历史记录全部保留。
- 已结算日期保存 `profileVersion` 和薪资快照，之后修改设置不会重算历史。
- 所有计时以时间戳重算，不依赖每秒累加。
- 跨天时先写入上一天 `DailyLedger`，再创建今天的记录。

## 7. 开发顺序

1. 先完成通用配置模型和本地数据迁移。
2. 改造网页设置 UI，支持预设、自定义工作日和多个工作档案。
3. 加入毛收入、到手估算、雇主成本三种展示口径。
4. 再迁移为微信小程序，使用同一套计费核心。
5. 最后做 iOS 原生界面和本地通知。

