-- Friends: visiting each other's rooms, gifts of gold, and the bonus for
-- training on the same day. Safe to run repeatedly in the Supabase SQL editor.
--
-- Every row here is kept to its owner, like the rest of the schema. What one
-- person may see of another — a name, a girl, a room — is handed over by the
-- functions below, which ask first whether the two are friends. Nobody's sets,
-- weights, memos or purse are ever returned.

-- The card a friend finds you by. The code is what is passed around; the
-- account id never leaves the database.
create table if not exists friend_cards (
  user_id uuid primary key references auth.users on delete cascade,
  code text not null unique,
  name text not null default '',
  girl text not null default '',
  updated_at timestamptz not null default now()
);

alter table friend_cards enable row level security;
drop policy if exists "own friend card" on friend_cards;
create policy "own friend card" on friend_cards for select using (auth.uid() = user_id);

-- One row each way, so "my friends" is a plain lookup on user_id.
create table if not exists friendships (
  user_id uuid not null references auth.users on delete cascade,
  friend_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

alter table friendships enable row level security;
drop policy if exists "own friendships" on friendships;
create policy "own friendships" on friendships for select using (auth.uid() = user_id);

-- Gold on its way to someone. Kept as rows rather than added to their purse
-- directly: the purse is settled forward on each person's own phone, and a
-- number changed underneath it would be overwritten by the next save. The
-- recipient collects, and the app adds it.
--
-- `day` makes each kind happen once: one gift per friend per day, and one
-- together-bonus per pair per day.
create table if not exists gifts (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users on delete cascade,
  to_user uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('gift', 'together')),
  amount integer not null check (amount > 0),
  day date not null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  unique (kind, from_user, to_user, day)
);

create index if not exists gifts_to_unclaimed_idx on gifts (to_user) where claimed_at is null;

alter table gifts enable row level security;
drop policy if exists "own gifts" on gifts;
create policy "own gifts" on gifts
  for select using (auth.uid() = to_user or auth.uid() = from_user);

-- Returns table shapes change; create or replace cannot. Dropped first.
drop function if exists ensure_friend_card(text, text);
drop function if exists my_friend_name();
drop function if exists add_friend(text);
drop function if exists remove_friend(uuid);
drop function if exists list_friends();
drop function if exists friend_room(uuid);
drop function if exists send_gift(uuid, integer, date);
drop function if exists claim_together(date, text);
drop function if exists together_days();
drop function if exists claim_gifts();
drop function if exists unclaim_gifts(uuid[]);

/*
  Make sure the caller has a card, and keep its name and girl current.
  The code is six letters from an alphabet without 0/O or 1/I/L, because it
  is read aloud and typed by hand.
*/
create function ensure_friend_card(p_name text, p_girl text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
  existing text;
begin
  if me is null then raise exception '로그인이 필요해요'; end if;

  select code into existing from friend_cards where user_id = me;
  if existing is not null then
    update friend_cards
      set name = left(coalesce(p_name, ''), 20), girl = coalesce(p_girl, ''), updated_at = now()
      where user_id = me;
    return existing;
  end if;

  loop
    candidate := '';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    begin
      insert into friend_cards (user_id, code, name, girl)
        values (me, candidate, left(coalesce(p_name, ''), 20), coalesce(p_girl, ''));
      return candidate;
    exception when unique_violation then
      -- Either the code was taken or a second call raced this one; both
      -- settle on the next pass.
      select code into existing from friend_cards where user_id = me;
      if existing is not null then return existing; end if;
    end;
  end loop;
end;
$$;

create function my_friend_name()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select name from friend_cards where user_id = auth.uid();
$$;

/* Befriend whoever holds this code. Both ways at once; returns their name. */
create function add_friend(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  them uuid;
  their_name text;
begin
  if me is null then raise exception '로그인이 필요해요'; end if;
  select user_id, name into them, their_name
    from friend_cards where code = upper(trim(p_code));
  if them is null then raise exception '그런 코드가 없어요'; end if;
  if them = me then raise exception '내 코드예요'; end if;

  insert into friendships (user_id, friend_id) values (me, them) on conflict do nothing;
  insert into friendships (user_id, friend_id) values (them, me) on conflict do nothing;
  return their_name;
end;
$$;

create function remove_friend(p_friend uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from friendships
  where (user_id = auth.uid() and friend_id = p_friend)
     or (user_id = p_friend and friend_id = auth.uid());
$$;

/*
  Friends, with the day each last trained — so the list can say who went
  today, which is the nudge. The day is all: not what, not how much.
*/
create function list_friends()
returns table (user_id uuid, name text, girl text, last_trained timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select f.friend_id,
         coalesce(c.name, ''),
         coalesce(c.girl, ''),
         (select max(w.started_at) from workouts w
            where w.user_id = f.friend_id and w.ended_at is not null)
  from friendships f
  left join friend_cards c on c.user_id = f.friend_id
  where f.user_id = auth.uid()
  order by f.created_at;
$$;

/* A friend's room: what she wears and what stands around her. Nothing else. */
create function friend_room(p_friend uuid)
returns table (name text, girl text, furniture text[], worn text[])
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (
    select 1 from friendships where user_id = auth.uid() and friend_id = p_friend
  ) then
    raise exception '친구가 아니에요';
  end if;
  return query
    select coalesce(c.name, ''), coalesce(c.girl, ''),
           coalesce(h.furniture, '{}'), coalesce(h.worn, '{}')
    from (select p_friend as id) x
    left join friend_cards c on c.user_id = x.id
    left join household h on h.user_id = x.id;
end;
$$;

/*
  Send gold. Taken from the sender's purse here, in one conditional update,
  so it cannot be sent twice or sent without being had. The amounts are few
  and small on purpose: a gift is a gesture, and a second account that could
  pour its gold into the first would make the shop meaningless.
*/
create function send_gift(p_friend uuid, p_amount integer, p_day date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception '로그인이 필요해요'; end if;
  if p_amount not in (10, 30, 50) then raise exception '보낼 수 없는 금액이에요'; end if;
  if not exists (
    select 1 from friendships where user_id = me and friend_id = p_friend
  ) then
    raise exception '친구가 아니에요';
  end if;
  if exists (
    select 1 from gifts
    where kind = 'gift' and from_user = me and to_user = p_friend and day = p_day
  ) then
    raise exception '오늘은 이미 보냈어요';
  end if;

  update household set gold = gold - p_amount, updated_at = now()
    where user_id = me and gold >= p_amount;
  if not found then raise exception '골드가 모자라요'; end if;

  insert into gifts (from_user, to_user, kind, amount, day)
    values (me, p_friend, 'gift', p_amount, p_day);
end;
$$;

/*
  The bonus for training on the same day as a friend. Both get it, whoever
  finishes second: the one who finished first was paid before there was
  anything to pay for, so the row is written for them too, and they collect
  it next time they look.

  `p_day` is the caller's day and `p_tz` their timezone, so a friend's
  session counts on the day it was on the caller's calendar.
*/
create function claim_together(p_day date, p_tz text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  bonus constant integer := 20;
  made integer := 0;
  them uuid;
begin
  if me is null then return 0; end if;
  if not exists (
    select 1 from workouts w
    where w.user_id = me and w.ended_at is not null
      and (w.started_at at time zone p_tz)::date = p_day
  ) then
    return 0;
  end if;

  for them in
    select f.friend_id from friendships f
    where f.user_id = me and exists (
      select 1 from workouts w
      where w.user_id = f.friend_id and w.ended_at is not null
        and (w.started_at at time zone p_tz)::date = p_day
    )
  loop
    insert into gifts (from_user, to_user, kind, amount, day)
      values (them, me, 'together', bonus, p_day) on conflict do nothing;
    if found then made := made + 1; end if;
    insert into gifts (from_user, to_user, kind, amount, day)
      values (me, them, 'together', bonus, p_day) on conflict do nothing;
  end loop;
  return made;
end;
$$;

/*
  The days the caller and each friend both trained, as far as the
  together-bonus has recorded them. The app counts the run from these.
  Recorded only when one of the two finishes a session, which is when
  both having trained becomes true — so there is nothing to miss.
*/
create function together_days()
returns table (friend_id uuid, day date)
language sql
security definer
set search_path = public
stable
as $$
  select g.from_user, g.day from gifts g
  join friendships f on f.user_id = auth.uid() and f.friend_id = g.from_user
  where g.kind = 'together' and g.to_user = auth.uid()
    and g.day > current_date - 400
  order by g.day desc;
$$;

/* Collect what has arrived. Marked claimed here; the app adds it to the purse. */
create function claim_gifts()
returns table (id uuid, kind text, amount integer, from_name text)
language sql
security definer
set search_path = public
as $$
  -- Two phones collecting at once cannot both get a row: the second update
  -- waits on the first, re-reads claimed_at, and skips it.
  update gifts g set claimed_at = now()
  where g.to_user = auth.uid() and g.claimed_at is null
  returning g.id, g.kind, g.amount,
    coalesce((select c.name from friend_cards c where c.user_id = g.from_user), '');
$$;

/* Hand them back when the purse could not be saved, so nothing is lost. */
create function unclaim_gifts(p_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update gifts set claimed_at = null
  where to_user = auth.uid() and id = any(p_ids);
$$;
