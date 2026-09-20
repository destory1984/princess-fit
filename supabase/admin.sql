-- Asking for a movement the catalogue has not got, and the desk that reads it.
--
-- Run this once, then add yourself by email:
--
--   insert into admins (user_id)
--   select id from auth.users where email = 'you@example.com'
--   on conflict (user_id) do nothing;
--
-- Not auth.uid(): the SQL editor runs as the owning role rather than as a
-- signed-in user, so auth.uid() is null there and the insert fails on the
-- not-null constraint.
--
-- Nobody is an admin until that row exists, including whoever created the
-- project.

create table if not exists admins (
  user_id uuid primary key references auth.users on delete cascade,
  added_at timestamptz not null default now()
);

alter table admins enable row level security;

-- Readable by admins only, and never writable from the app. Adding one is a
-- deliberate act at the database, not something a client can talk its way
-- into — a table that grants privilege must not be editable by the thing it
-- grants privilege over.
drop policy if exists "admins read admins" on admins;
create policy "admins read admins" on admins
  for select using (exists (select 1 from admins a where a.user_id = auth.uid()));

create table if not exists exercise_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  -- What they called it. The only field that is always filled in.
  name text not null,
  -- Their guesses, which may be wrong and are still worth having: someone who
  -- says 「등, 케이블」 has narrowed it to a handful of movements.
  muscle_group text,
  equipment text,
  note text,
  -- new → seen → added | declined. Kept as text rather than an enum so a new
  -- state does not need a migration on a table this small.
  status text not null default 'new',
  -- What the desk wrote back, if anything. Shown to the person who asked.
  reply text,
  created_at timestamptz not null default now(),
  handled_at timestamptz
);

create index if not exists exercise_requests_status_idx
  on exercise_requests (status, created_at desc);

alter table exercise_requests enable row level security;

-- Anyone may ask, and may read and withdraw their own. They may not edit one
-- after sending it: a request whose text changes after it was read is a
-- request nobody can act on.
drop policy if exists "own requests" on exercise_requests;
create policy "own requests" on exercise_requests
  for select using (auth.uid() = user_id);

drop policy if exists "send requests" on exercise_requests;
create policy "send requests" on exercise_requests
  for insert with check (auth.uid() = user_id);

drop policy if exists "withdraw own requests" on exercise_requests;
create policy "withdraw own requests" on exercise_requests
  for delete using (auth.uid() = user_id);

-- The desk reads everything and answers.
drop policy if exists "admins read requests" on exercise_requests;
create policy "admins read requests" on exercise_requests
  for select using (exists (select 1 from admins a where a.user_id = auth.uid()));

drop policy if exists "admins answer requests" on exercise_requests;
create policy "admins answer requests" on exercise_requests
  for update using (exists (select 1 from admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from admins a where a.user_id = auth.uid()));

notify pgrst, 'reload schema';
