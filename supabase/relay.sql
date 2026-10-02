-- 모델 중계: 폰이 줄을 넣고, 전하의 PC(relay/worker.mjs)가 받아 답을 적는다.
-- 여러 번 돌려도 된다.
--
-- 폰은 PC의 Ollama에 직접 닿을 수 없다(집 밖, 다른 사람의 폰). 그래서 이미 모두가
-- 닿는 Supabase를 우체통으로 쓴다. 새 서버도, 열린 포트도 없다. PC는 밖으로만
-- 묻고(폴링), 아무도 PC로 들어오지 않는다.
--
-- 일꾼은 service-role 키로 돈다. 그 키는 PC의 relay/.env에만 있고 앱에는 없다
-- (NOTES.md 「service-role 키는 브라우저에 두지 않는다」).

create table if not exists model_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null default 'advice',
  prompt text not null,
  status text not null default 'queued'
    check (status in ('queued', 'working', 'done', 'failed', 'expired')),
  answer text,
  provider text check (provider in ('ollama', 'codex')),
  model text,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  -- 프롬프트가 지나치게 길면 넣는 쪽이 잘못한 것이다. 일꾼의 시간과 PC를 지킨다.
  constraint model_requests_prompt_size check (char_length(prompt) between 1 and 12000),
  constraint model_requests_kind_size check (char_length(kind) between 1 and 40)
);

create index if not exists model_requests_queue on model_requests (created_at)
  where status = 'queued';
create index if not exists model_requests_user_day on model_requests (user_id, created_at);

alter table model_requests enable row level security;

-- 폰은 제 줄만 넣고 제 줄만 읽는다. 고치기와 지우기는 일꾼(service-role)만 한다.
drop policy if exists "own requests insert" on model_requests;
create policy "own requests insert" on model_requests
  for insert with check (
    auth.uid() = user_id and status = 'queued' and answer is null
    and provider is null and started_at is null and finished_at is null
  );

drop policy if exists "own requests read" on model_requests;
create policy "own requests read" on model_requests
  for select using (auth.uid() = user_id);

drop policy if exists "admins read model requests" on model_requests;
create policy "admins read model requests" on model_requests
  for select using (is_admin());

-- 일꾼이 살아 있다는 표시. 줄은 하나뿐이고 일꾼이 1분마다 시각을 고쳐 적는다.
-- 폰은 이것을 먼저 보고, 2분 넘게 끊겼으면 묻지 않고 바로 규칙의 답을 쓴다
-- (lib/relay.ts의 relayAlive). PC가 꺼져 있는 동안 매번 45초를 기다리지 않게 한다.
create table if not exists relay_heartbeat (
  id int primary key default 1 check (id = 1),
  beat_at timestamptz not null default now()
);

alter table relay_heartbeat enable row level security;

-- 로그인한 사람은 누구나 읽는다. 적힌 것은 시각 하나뿐이다. 쓰는 것은 일꾼(service-role)만.
drop policy if exists "anyone signed in reads the heartbeat" on relay_heartbeat;
create policy "anyone signed in reads the heartbeat" on relay_heartbeat
  for select using (auth.uid() is not null);

-- 하루 60건. 한 사람이 PC 하나를 붙잡지 못하게 한다. 운동 하나에 조언·신체·통계를
-- 다 물어도 열 건이 안 되니, 넘는 것은 고장이거나 남용이다.
create or replace function model_requests_daily_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from model_requests
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 60 then
    raise exception 'model_requests: daily cap reached' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists model_requests_daily_cap on model_requests;
create trigger model_requests_daily_cap before insert on model_requests
  for each row execute function model_requests_daily_cap();
