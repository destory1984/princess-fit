-- 계정 지우기. 여러 번 돌려도 된다.
--
-- 앱 안에서 제 계정과 기록을 지우는 길이다(설정 탭 맨 아래). 스토어에 올리려면
-- 있어야 하고, 시험 사용자에게도 「그만둘 때 지우는 법」을 말해 줄 수 있어야 한다.
--
-- 앱은 다른 사람의 계정을 지울 수 없다. 이 함수는 인자를 받지 않고, 지우는 것은
-- 언제나 부른 사람 자신(auth.uid())이다. auth.users의 줄 하나를 지우면 나머지는
-- 따라 지워진다 — 모든 표가 그 줄에 `on delete cascade`로 매여 있다(운동, 세트,
-- 루틴, 종목, 집, 기억, 고른 아이, 신체·수면 기록, 친구 카드와 친구 사이, 선물,
-- 요청, 프로필, 모델 물음). 표를 새로 만들 때 이 매임을 빠뜨리면 그 표의 줄이
-- 주인 없이 남는다.
--
-- service-role 키는 브라우저에 두지 않으므로(NOTES.md) `security definer` 함수로 푼다.

create or replace function delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'delete_my_account: not signed in' using errcode = '28000';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function delete_my_account() from public;
revoke all on function delete_my_account() from anon;
grant execute on function delete_my_account() to authenticated;
