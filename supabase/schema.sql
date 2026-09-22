-- Refit schema. Safe to run repeatedly in the Supabase SQL editor.

create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  muscle_group text not null default 'etc',
  created_at timestamptz not null default now()
);

create table if not exists routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references routines on delete cascade,
  exercise_id uuid not null references exercises on delete cascade,
  position int not null default 0,
  target_sets int not null default 3,
  target_reps int not null default 10
);

create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  routine_id uuid references routines on delete set null,
  title text not null default '운동',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  memo text,
  -- How the body turned up that day: light / normal / heavy. Null for every
  -- session recorded before the question was asked, which is not the same as
  -- an ordinary day and must not be read as one.
  condition text
);

create table if not exists workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts on delete cascade,
  exercise_id uuid not null references exercises on delete cascade,
  position int not null default 0,
  set_no int not null,
  weight_kg numeric(6, 2) not null default 0,
  reps int not null default 0,
  done boolean not null default false
);

alter table workout_sets add column if not exists position int not null default 0;
alter table exercises add column if not exists equipment text not null default '기타';
alter table exercises add column if not exists secondary_group text;
alter table exercises add column if not exists muscle_detail text not null default '';
-- Comma-separated react-native-body-highlighter slugs, e.g. 'chest,triceps'.
alter table exercises add column if not exists body_parts text not null default '';
-- How a set is measured: weight_reps | duration | cardio (duration + distance).
alter table exercises add column if not exists track_type text not null default 'weight_reps';
-- Short how-to steps, one per line.
alter table exercises add column if not exists how_to text not null default '';
alter table workout_sets add column if not exists duration_sec int not null default 0;
alter table workout_sets add column if not exists distance_km numeric(6, 2) not null default 0;

create index if not exists workout_sets_workout_idx on workout_sets (workout_id);
create index if not exists workout_sets_exercise_idx on workout_sets (exercise_id);
create index if not exists workouts_user_started_idx on workouts (user_id, started_at desc);
create index if not exists routine_exercises_routine_idx on routine_exercises (routine_id, position);

alter table exercises enable row level security;
alter table routines enable row level security;
alter table routine_exercises enable row level security;
alter table workouts enable row level security;
alter table workout_sets enable row level security;

drop policy if exists "own exercises" on exercises;
create policy "own exercises" on exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own routines" on routines;
create policy "own routines" on routines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own workouts" on workouts;
create policy "own workouts" on workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own routine exercises" on routine_exercises;
create policy "own routine exercises" on routine_exercises
  for all using (
    exists (select 1 from routines r where r.id = routine_id and r.user_id = auth.uid())
  ) with check (
    exists (select 1 from routines r where r.id = routine_id and r.user_id = auth.uid())
  );

drop policy if exists "own workout sets" on workout_sets;
create policy "own workout sets" on workout_sets
  for all using (
    exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid())
  ) with check (
    exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid())
  );

-- The household ledger: her purse and how she is faring. One row per user; the
-- app settles it forward on open, so the stored row is only ever as fresh as
-- the last visit.
create table if not exists household (
  user_id uuid primary key references auth.users on delete cascade,
  gold integer not null default 0,
  satiety integer not null default 100,
  attire integer not null default 100,
  settled_on date not null default current_date,
  -- The course she is part-way through, if any. Two day keys rather than
  -- timestamps: a lesson is counted in mornings she went, so the hour it was
  -- paid for must not change its length.
  lesson_id text,
  lesson_started_on date,
  lesson_ends_on date,
  updated_at timestamptz not null default now()
);

alter table household enable row level security;

drop policy if exists "own household" on household;
create policy "own household" on household
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- What she owns. Clothes are permanent, so they live beside the purse rather
-- than in a log of purchases.
alter table household add column if not exists wardrobe text[] not null default '{}';

-- Furniture she has bought, and what schooling has made of her. Kept beside
-- the purse so one read fetches the whole household.
alter table household add column if not exists furniture text[] not null default '{}';
alter table household add column if not exists grace integer not null default 0;
alter table household add column if not exists learning integer not null default 0;
alter table household add column if not exists charm integer not null default 0;

-- What she has on, as opposed to what she owns. Garments she has bought live
-- in `wardrobe`; the subset she is currently wearing lives here.
alter table household add column if not exists worn text[] not null default '{}';

-- How long she rests after a set of this exercise. A minute suits most things;
-- a heavy squat wants longer and a curl wants less, so it lives per exercise.
alter table exercises add column if not exists rest_sec integer not null default 60;

-- Body measurements, one row per reading. Kept separate from workouts: they
-- are taken on their own schedule and mean nothing without a date.
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

-- Starred exercises, which sort to the top of the picker.
alter table exercises add column if not exists favourite boolean not null default false;

-- Sleep, written down by hand. Times are minutes past midnight so a night
-- that crosses midnight needs no timezone reasoning; `slept_on` is the
-- morning you woke, which is how a night is named.
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

alter table exercises add column if not exists hidden boolean not null default false;

alter table workout_sets add column if not exists rir int;

alter table workout_sets add column if not exists warmup boolean not null default false;

alter table workout_sets add column if not exists side text;

alter table workout_sets add column if not exists done_at timestamptz;

alter table workouts add column if not exists advice        text;
alter table workouts add column if not exists advice_source text;
alter table workouts add column if not exists advice_speaker text;

-- When the session's gold was paid. Null until then, so one closed by itself
-- or filled in later can still be paid, and one paid cannot be paid again.
alter table workouts add column if not exists paid_at timestamptz;

-- What she remembers. One row per kind of memory, ever: the unique key is
-- what keeps a first day from being written twice when two phones race.
-- The line is kept as it was written, so renaming an exercise later does not
-- rewrite what happened.
create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  day date not null,
  line text not null,
  detail text,
  created_at timestamptz not null default now(),
  unique (user_id, kind)
);

alter table memories enable row level security;

drop policy if exists "own memories" on memories;
create policy "own memories" on memories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table household add column if not exists gifted_on date;

alter table workouts add column if not exists diary    text;
alter table workouts add column if not exists diary_by text;

-- Who was here, and from when (lib/picks.ts). One row each time a girl is
-- chosen; closeness, memories and the diary are all counted per girl from it.
create table if not exists girl_picks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  girl text not null,
  picked_at timestamptz not null default now()
);
create index if not exists girl_picks_user_idx on girl_picks (user_id, picked_at);
alter table girl_picks enable row level security;
drop policy if exists "own girl picks" on girl_picks;
create policy "own girl picks" on girl_picks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Memories are each girl's own now: one first day per girl, not per person.
-- Rows from before this have no girl; the app gives them to the first girl
-- chosen, which is who was there.
alter table memories add column if not exists girl text;
alter table memories drop constraint if exists memories_user_id_kind_key;
create unique index if not exists memories_user_girl_kind on memories (user_id, girl, kind);
