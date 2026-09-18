# Refit

개인용 운동 기록 앱. Expo(React Native) + Supabase.

## 처음 한 번만

1. Supabase 프로젝트를 만들고 **SQL Editor**에서 `supabase/schema.sql`을 실행한다. 이 파일은 여러 번 실행해도 안전하므로, 스키마가 바뀌면 그냥 다시 실행하면 된다.
2. 프로젝트 루트에 `.env`를 만들고 값을 채운다 (`.env.example` 참고). `.env`는 git에 올라가지 않는다.
   - `EXPO_PUBLIC_SUPABASE_URL` — Project Settings → Data API의 URL (`/rest/v1/` 제외)
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API Keys의 anon/publishable 키
3. 의존성 설치:

   ```bash
   npm install
   ```

## 실행

```bash
npx expo start
```

- **아이폰**: App Store에서 Expo Go 설치 → 카메라로 터미널의 QR 스캔. PC와 같은 Wi-Fi여야 한다.
  - Expo Go에 로그인돼 있으면 PC의 CLI도 같은 계정이어야 열린다. 둘 중 하나만 로그인된 상태면 Expo Go에서 로그아웃하면 된다.
  - 폰이 서버에 못 닿으면 아이폰 **설정 → 앱 → Expo Go → 로컬 네트워크**가 켜져 있는지 확인.
- **웹**: 터미널에서 `w` 또는 브라우저로 http://localhost:8081

## 구조

- `app/` — Expo Router 화면. `(tabs)/`가 하단 탭(오늘·루틴·기록·통계·설정), `workout/[id]`가 운동 세션, `routine/[id]`가 루틴 편집.
- `lib/db.ts` — Supabase 쿼리 전부. 화면은 이 함수들만 호출한다.
- `lib/catalog.ts` — 설정 탭 "기본 종목 불러오기"에 쓰는 종목 목록.
- `supabase/schema.sql` — 테이블과 RLS 정책. 모든 행은 `auth.uid()` 기준으로 본인 것만 보인다.

## 검증

```bash
npx tsc --noEmit
```
