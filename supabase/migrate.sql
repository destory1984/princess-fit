-- Run this if the shop reports a missing column. It adds only what was added
-- after the household table first shipped, and is safe to run more than once.
alter table household add column if not exists wardrobe  text[] not null default '{}';
alter table household add column if not exists worn      text[] not null default '{}';
alter table household add column if not exists furniture text[] not null default '{}';
alter table household add column if not exists grace     integer not null default 0;
alter table household add column if not exists learning  integer not null default 0;
alter table household add column if not exists charm     integer not null default 0;
alter table exercises add column if not exists rest_sec integer not null default 60;

create table if not exists body_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  measured_on date not null default current_date,
  weight_kg numeric(5, 1),
  body_fat_pct numeric(4, 1),
  muscle_kg numeric(5, 1),
  created_at timestamptz not null default now(),
  unique (user_id, measured_on)
);
create index if not exists body_logs_user_day_idx on body_logs (user_id, measured_on desc);
alter table body_logs enable row level security;
drop policy if exists "own body logs" on body_logs;
create policy "own body logs" on body_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
