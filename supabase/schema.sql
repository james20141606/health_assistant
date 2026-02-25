-- Health Tracker Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Daily health logs
create table if not exists daily_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  sleep_start time,
  sleep_end time,
  sleep_hours numeric(3,1),
  stress smallint not null default 5 check (stress >= 0 and stress <= 10),
  reflux smallint not null default 0 check (reflux >= 0 and reflux <= 10),
  breathless smallint not null default 0 check (breathless >= 0 and breathless <= 10),
  triggers jsonb not null default '{"milk_tea":false,"coffee":false,"spicy":false,"late_meal":false,"alcohol":false}',
  meds jsonb not null default '{"omeprazole_mg":0,"famotidine_mg":0}',
  workout jsonb not null default '{"type":"","minutes":0,"rpe":0}',
  weight_kg numeric(4,1),
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);

-- AI analysis insights
create table if not exists ai_insights (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  input_summary jsonb not null default '{}',
  output_text text not null default '',
  output_structured jsonb,
  tags jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique(user_id, date)
);

-- Indexes for performance
create index if not exists idx_daily_logs_user_date on daily_logs(user_id, date);
create index if not exists idx_ai_insights_user_date on ai_insights(user_id, date);

-- Row Level Security (RLS)
alter table daily_logs enable row level security;
alter table ai_insights enable row level security;

-- Policies: users can only access their own data
create policy "Users can read own daily_logs"
  on daily_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own daily_logs"
  on daily_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own daily_logs"
  on daily_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete own daily_logs"
  on daily_logs for delete
  using (auth.uid() = user_id);

create policy "Users can read own ai_insights"
  on ai_insights for select
  using (auth.uid() = user_id);

create policy "Users can insert own ai_insights"
  on ai_insights for insert
  with check (auth.uid() = user_id);

create policy "Users can update own ai_insights"
  on ai_insights for update
  using (auth.uid() = user_id);

create policy "Users can delete own ai_insights"
  on ai_insights for delete
  using (auth.uid() = user_id);
