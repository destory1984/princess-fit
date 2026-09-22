/*
  Pull back the end of sessions that were closed long after the last set.

  Until finishWorkout learned to end a session at its last set, it ended it
  when 운동 완료 was pressed — on the way out of the building, or the next
  morning — which is how 554분 ended up beside seven sets. New sessions no
  longer do this; this puts the old ones right by the same rule:

  - the end becomes the last set's done_at,
  - only when that set was done on the same day the session started (Seoul
    time), so a backdated session written up days later is left alone,
  - only when it makes the session shorter, so running this twice, or on
    sessions that were already right, changes nothing.

  Sets ticked before done_at existed have no time on them. Those sessions
  cannot be put right from the data and are left as they are.

  Run the SELECT first to see what would change, then the UPDATE.
*/

-- 1. What would change.
with last_set as (
  select workout_id, max(done_at) as last_done
  from workout_sets
  where done_at is not null
  group by workout_id
)
select
  w.id,
  w.started_at at time zone 'Asia/Seoul' as started,
  w.ended_at at time zone 'Asia/Seoul' as ended_now,
  l.last_done at time zone 'Asia/Seoul' as ended_after,
  round(extract(epoch from w.ended_at - w.started_at) / 60) as minutes_now,
  round(extract(epoch from l.last_done - w.started_at) / 60) as minutes_after
from workouts w
join last_set l on l.workout_id = w.id
where w.ended_at is not null
  and l.last_done < w.ended_at
  and l.last_done >= w.started_at
  and (l.last_done at time zone 'Asia/Seoul')::date
    = (w.started_at at time zone 'Asia/Seoul')::date
order by w.started_at desc;

-- 2. Change it.
with last_set as (
  select workout_id, max(done_at) as last_done
  from workout_sets
  where done_at is not null
  group by workout_id
)
update workouts w
set ended_at = l.last_done
from last_set l
where l.workout_id = w.id
  and w.ended_at is not null
  and l.last_done < w.ended_at
  and l.last_done >= w.started_at
  and (l.last_done at time zone 'Asia/Seoul')::date
    = (w.started_at at time zone 'Asia/Seoul')::date;
