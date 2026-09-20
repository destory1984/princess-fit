-- Brings an older database up to the current schema. Every statement is
-- idempotent, so running it more than once is harmless — and a test holds it
-- to covering every column schema.sql adds after a table is created.
alter table workout_sets add column if not exists position int not null default 0;
alter table workout_sets add column if not exists duration_sec int not null default 0;
alter table workout_sets add column if not exists distance_km numeric(6, 2) not null default 0;
alter table exercises add column if not exists equipment text not null default '기타';
alter table exercises add column if not exists secondary_group text;
alter table exercises add column if not exists muscle_detail text not null default '';
alter table exercises add column if not exists body_parts text not null default '';
alter table exercises add column if not exists track_type text not null default 'weight_reps';
alter table exercises add column if not exists how_to text not null default '';

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
alter table exercises add column if not exists favourite boolean not null default false;

create table if not exists sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  slept_on date not null default current_date,
  bed_minute int not null,
  wake_minute int not null,
  created_at timestamptz not null default now(),
  unique (user_id, slept_on)
);
create index if not exists sleep_logs_user_day_idx on sleep_logs (user_id, slept_on desc);
alter table sleep_logs enable row level security;
drop policy if exists "own sleep logs" on sleep_logs;
create policy "own sleep logs" on sleep_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table workouts add column if not exists condition text;

alter table household add column if not exists lesson_id         text;
alter table household add column if not exists lesson_started_on date;
alter table household add column if not exists lesson_ends_on    date;

alter table exercises add column if not exists hidden boolean not null default false;

alter table workout_sets add column if not exists rir int;

alter table workout_sets add column if not exists warmup boolean not null default false;
