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

/*
  Whether the caller is an admin, asked without reading the table directly.

  The obvious policy — 「readable by admins」, checked by looking in admins —
  bites its own tail: the lookup inside the policy is itself a read of the
  table the policy guards. Postgres either refuses it as infinite recursion or
  quietly returns nothing, and the page in front of it can only report 「이
  계정은 관리자가 아니에요」 to someone who is.

  security definer runs the check as the function's owner, outside row level
  security, so the question can be answered once and cleanly. It reads one
  row and returns a boolean; it cannot be used to see anything else.
*/
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$ select exists (select 1 from admins where user_id = auth.uid()) $$;

revoke all on function is_admin() from public;
grant execute on function is_admin() to authenticated;

-- Never writable from the app. Adding one is a deliberate act at the
-- database: a table that grants privilege must not be editable by the thing
-- it grants privilege over.
drop policy if exists "admins read admins" on admins;
create policy "admins read admins" on admins
  for select using (is_admin());

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
  for select using (is_admin());

drop policy if exists "admins answer requests" on exercise_requests;
create policy "admins answer requests" on exercise_requests
  for update using (is_admin()) with check (is_admin());

notify pgrst, 'reload schema';


-- ---------------------------------------------------------------------------
-- Who is using this.
--
-- auth.users cannot be read with the app's key, and it should not be: the
-- service-role key that could is the one key that must never reach a browser,
-- since it can delete every row every user has. So the parts worth showing are
-- mirrored into a table of our own, kept current by a trigger.

create table if not exists profiles (
  user_id uuid primary key references auth.users on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (user_id, email, created_at)
  values (new.id, new.email, new.created_at)
  on conflict (user_id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Everyone who signed up before the trigger existed.
insert into profiles (user_id, email, created_at)
select id, email, created_at from auth.users
on conflict (user_id) do update set email = excluded.email;

alter table profiles enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for select using (auth.uid() = user_id);

drop policy if exists "admins read profiles" on profiles;
create policy "admins read profiles" on profiles for select using (is_admin());

/*
  The list, with each person's training counted beside them.

  A function rather than a view, because the counting has to reach into
  workouts — which every policy there quite rightly keeps to its owner. This
  runs as its owner and refuses anyone who is not an admin, so the desk can
  see totals without any user's rows becoming readable by another.

  Totals only. Nobody's sets, weights or memos are returned.
*/
create or replace function admin_users()
returns table (
  user_id uuid,
  email text,
  joined timestamptz,
  workouts bigint,
  last_workout timestamptz,
  admin boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.user_id,
    p.email,
    p.created_at,
    count(w.id),
    max(w.started_at),
    exists (select 1 from admins a where a.user_id = p.user_id)
  from profiles p
  left join workouts w on w.user_id = p.user_id and w.ended_at is not null
  where is_admin()
  group by p.user_id, p.email, p.created_at
  order by p.created_at desc;
$$;

revoke all on function admin_users() from public;
grant execute on function admin_users() to authenticated;

/*
  Making someone an admin, or taking it back.
  
  Refuses to remove the last one. Locking every admin out of the desk is a
  single mis-tap otherwise, and it cannot be undone from the app — only from
  the SQL editor, by someone who knows that is where to go.
*/
create or replace function admin_set_admin(target uuid, make_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception '관리자만 할 수 있어요.';
  end if;

  if make_admin then
    insert into admins (user_id) values (target) on conflict (user_id) do nothing;
  else
    if (select count(*) from admins) <= 1 then
      raise exception '마지막 관리자는 내릴 수 없어요.';
    end if;
    delete from admins where user_id = target;
  end if;
end;
$$;

revoke all on function admin_set_admin(uuid, boolean) from public;
grant execute on function admin_set_admin(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
