-- 시험 2주 뒤에 보는 숫자. Supabase SQL 편집기에서 물음 하나씩 골라 돌린다.
--
-- docs/direction.md 7절: 「새 추적 장치는 두지 않는다. DB에 이미 있는 기록으로 센다.」
-- 그래서 여기에는 표도 함수도 없다. 읽기만 하는 물음 넷이고, 아무것도 고치지 않는다.
-- SQL 편집기는 관리자 권한으로 돌므로 모든 사람의 줄이 보인다. 앱에서는 돌릴 수 없다.
--
-- 「운동한 날」은 앱과 같은 뜻으로 센다: 끝났고, 속이 있는 운동(완료한 세트나 기록이
-- 하나라도 있는 것). 빈 운동은 운동이 아니다(NOTES.md).
--
-- 날짜는 한국 시각으로 자른다. 밤 11시의 운동이 다음 날로 넘어가지 않게.


-- 1. 둘째 주 잔존 -----------------------------------------------------------------
-- 첫 운동부터 7일 안을 「첫 주」, 그다음 7일을 「둘째 주」로 본다. 사람마다 제 첫
-- 운동에서 센다 — 달력의 주로 세면 금요일에 시작한 사람의 첫 주가 이틀이 된다.
-- 절반 이상이면 이 방향을 이어 간다.
--
-- 둘째 주가 아직 다 지나지 않은 사람은 뺀다. 넣으면 잔존이 실제보다 낮게 나온다.
with real as (
  select w.user_id, (w.started_at at time zone 'Asia/Seoul')::date as day
  from workouts w
  where w.ended_at is not null
    and exists (
      select 1 from workout_sets s
      where s.workout_id = w.id and s.done
    )
),
firsts as (
  select user_id, min(day) as first_day from real group by user_id
),
judged as (
  select f.user_id,
         exists (
           select 1 from real r
           where r.user_id = f.user_id and r.day between f.first_day + 7 and f.first_day + 13
         ) as came_back
  from firsts f
  where f.first_day + 13 < (now() at time zone 'Asia/Seoul')::date
)
select count(*)                                   as "첫 주에 운동한 사람",
       count(*) filter (where came_back)          as "둘째 주에도 운동한 사람",
       round(100.0 * count(*) filter (where came_back) / nullif(count(*), 0)) as "잔존 %"
from judged;


-- 2. 첫날 한 바퀴 -----------------------------------------------------------------
-- 첫 운동을 한 그날에 선물까지 간 사람의 비율. 선물한 날은 기억에 `gift:<물건>`으로
-- 남는다.
with real as (
  select w.user_id, (w.started_at at time zone 'Asia/Seoul')::date as day
  from workouts w
  where w.ended_at is not null
    and exists (
      select 1 from workout_sets s
      where s.workout_id = w.id and s.done
    )
),
firsts as (
  select user_id, min(day) as first_day from real group by user_id
)
select count(*) as "첫 운동을 한 사람",
       count(*) filter (where exists (
         select 1 from memories m
         where m.user_id = f.user_id and m.kind like 'gift:%' and m.day = f.first_day
       )) as "그날 선물까지 간 사람",
       count(*) filter (where exists (
         select 1 from memories m
         where m.user_id = f.user_id and m.kind like 'gift:%'
       )) as "언제든 선물을 한 사람"
from firsts f;


-- 3. 막힘 -------------------------------------------------------------------------
-- 사람들이 직접 만든 종목. 많으면 기본 종목이 아직 모자란 것이고, 여러 사람이 같은
-- 이름을 만들었으면 그것부터 기본 종목에 넣는다.
--
-- 기본 종목은 「하는 법」이 채워져 들어오고 손수 만든 것은 비어 있다. 그것으로 가른다.
-- 설정에서 「정보 새로 고치기」를 한 번도 누르지 않은 옛 계정의 기본 종목도 비어 있어
-- 여기에 섞여 나올 수 있다 — 이름을 보면 안다.
select e.name                       as "종목",
       count(distinct e.user_id)    as "만든 사람 수",
       count(s.id)                  as "그 종목으로 적은 세트"
from exercises e
left join workout_sets s on s.exercise_id = e.id
where e.how_to = ''
group by e.name
order by 2 desc, 3 desc, 1;


-- 4. 조언 중계 --------------------------------------------------------------------
-- 누가 답했는지와 얼마나 걸렸는지. 규칙이 답한 것은 여기에 줄이 없다 — 일꾼이 꺼져
-- 있으면 폰이 묻지도 않기 때문이다. 그 몫은 아래 둘째 물음으로 어림한다.
-- relay.sql을 돌리지 않았으면 이 표가 없어 오류가 난다.
select coalesce(provider, '(답 없음)')                         as "답한 쪽",
       status                                                   as "끝",
       count(*)                                                 as "건",
       round(avg(extract(epoch from (finished_at - created_at)))::numeric, 1) as "평균 걸린 초",
       round(max(extract(epoch from (finished_at - created_at)))::numeric, 1) as "가장 오래 걸린 초"
from model_requests
group by 1, 2
order by 3 desc;

-- 운동 조언이 저장된 것 가운데 모델의 답과 규칙의 답. 중계가 꺼져 있던 몫이 여기서 보인다.
select coalesce(advice_source, '(조언 없음)') as "조언을 만든 쪽",
       count(*)                               as "운동 수"
from workouts
where ended_at is not null
group by 1
order by 2 desc;
