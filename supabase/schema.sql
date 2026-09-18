-- Refit schema. Run this in the Supabase SQL editor.

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
  set_no int not null,
  weight_kg numeric(6, 2) not null default 0,
  reps int not null default 0,
  done boolean not null default false
);

create index if not exists workout_sets_workout_idx on workout_sets (workout_id);
create index if not exists workouts_user_started_idx on workouts (user_id, started_at desc);
create index if not exists routine_exercises_routine_idx on routine_exercises (routine_id, position);

alter table exercises enable row level security;
alter table routines enable row level security;
alter table routine_exercises enable row level security;
alter table workouts enable row level security;
alter table workout_sets enable row level security;

create policy "own exercises" on exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own routines" on routines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own workouts" on workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own routine exercises" on routine_exercises
  for all using (
    exists (select 1 from routines r where r.id = routine_id and r.user_id = auth.uid())
  ) with check (
    exists (select 1 from routines r where r.id = routine_id and r.user_id = auth.uid())
  );

create policy "own workout sets" on workout_sets
  for all using (
    exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid())
  ) with check (
    exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid())
  );
