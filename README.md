# Health Tracker PWA

个人健康打卡 + AI 分析建议的 PWA 应用。可添加到 iPhone 桌面当 App 使用。

## 技术栈

- **前端**: Next.js (App Router) + TypeScript + Tailwind CSS
- **数据库/认证**: Supabase (Postgres + Auth + RLS)
- **图表**: Recharts
- **AI 分析**: Anthropic Claude API
- **部署**: Vercel + Supabase

## 功能

### /log - 每日打卡（30 秒完成）
- 睡眠：入睡/起床时间，自动计算时长
- 状态：压力 / 胃酸 / 胸闷（0-10 滑块）
- 触发因素：奶茶 / 咖啡 / 辣 / 夜宵 / 酒（勾选）
- 用药：奥美拉唑 / 法莫替丁（mg）
- 运动：类型 / 分钟 / RPE
- 体重 + 备注（可选）
- **"复制昨天"** 快捷按钮

### /history - 历史记录
- 按月查看，列表展示
- 编辑 / 删除
- 一键导出 CSV / JSON（给医生看）

### /insights - 数据分析
- 7/30 天趋势图（睡眠 / 压力 / 胃酸 / 运动）
- 触发因素 vs 胃酸关联统计
- AI 分析建议（结构化输出）：
  - today_focus：今日重点
  - micro_actions：3 条可执行小动作
  - risk_flags：注意信号
  - experiment：7 天小实验

## 快速开始

### 1. 创建 Supabase 项目

1. 去 [supabase.com](https://supabase.com) 创建项目
2. 在 SQL Editor 中运行 `supabase/schema.sql`
3. 在 Authentication > Settings 中启用 Email 登录

### 2. 配置环境变量

```bash
cp .env.local.example .env.local
```

填入：
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `ANTHROPIC_API_KEY` - Anthropic API key

### 3. 本地开发

```bash
npm install
npm run dev
```

访问 http://localhost:3000

### 4. 部署到 Vercel

1. 推送代码到 GitHub
2. 在 Vercel 中导入项目
3. 添加环境变量（同 .env.local）
4. 部署

### 5. 添加到 iPhone 桌面

1. 用 Safari 打开部署后的网址
2. 点击分享按钮 → "添加到主屏幕"
3. 像 App 一样使用

## 数据库表结构

### daily_logs
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| user_id | uuid | 用户 ID |
| date | date | 日期（唯一） |
| sleep_start/end | time | 入睡/起床 |
| sleep_hours | numeric | 睡眠时长 |
| stress | 0-10 | 压力 |
| reflux | 0-10 | 胃酸 |
| breathless | 0-10 | 胸闷 |
| triggers | jsonb | 触发因素 |
| meds | jsonb | 用药 |
| workout | jsonb | 运动 |
| weight_kg | numeric | 体重 |
| notes | text | 备注 |

### ai_insights
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| user_id | uuid | 用户 ID |
| date | date | 日期 |
| input_summary | jsonb | 输入摘要 |
| output_text | text | 原始输出 |
| output_structured | jsonb | 结构化建议 |
| tags | jsonb | 标签 |

## 安全

- 所有表启用 RLS，用户只能访问自己的数据
- 密码通过 Supabase Auth 管理
- API key 仅存在服务端环境变量
- AI 建议附"不替代医疗诊断"声明
