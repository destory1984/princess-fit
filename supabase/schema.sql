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
  memo text
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
