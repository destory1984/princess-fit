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

4. 앱에 로그인한 뒤 **설정 탭 → 기본 종목 불러오기 · 정보 새로 고치기**를 한 번 누른다. 67개 종목이 기구·근육·하는 법과 함께 채워진다.

> 스키마를 다시 실행한 뒤에는 이 버튼을 한 번 더 눌러야 새로 생긴 칸(기구, 근육, 기록 방식, 하는 법 등)이 기존 종목에도 채워진다. 이미 채워진 값은 건드리지 않는다.

## 실행

```bash
npx expo start
```

- **웹(기본)**: 브라우저로 http://localhost:8081 — 화면을 고치고 확인하기엔 이쪽이 가장 빠르다.
- **아이폰**: Expo Go 설치 후 카메라로 QR 스캔. PC와 같은 Wi-Fi여야 한다.
  - Expo Go에 로그인돼 있으면 PC의 CLI도 **같은 계정**이어야 열린다. 둘 중 하나만 로그인된 상태면 Expo Go에서 로그아웃한다.
  - 폰이 서버에 못 닿으면 아이폰 **설정 → 앱 → Expo Go → 로컬 네트워크**를 확인한다.

웹에서만 다르게 동작하는 것들이 있다 — `Alert`는 아무 일도 하지 않고(`lib/confirm.ts`가 우회한다), 숫자 자판·햅틱·안전 영역은 폰에서만 드러난다.

## 운동 후 AI 조언 (선택)

운동을 마치면 요약 화면이 모델에게 조언을 청한다. 서버가 없으면 규칙 기반 조언으로 넘어가므로 설정하지 않아도 동작한다.

```
EXPO_PUBLIC_ADVICE_URL=http://localhost:11434/api/generate
EXPO_PUBLIC_ADVICE_MODEL=qwen3.8:27b
```

폰에서도 모델 조언을 받으려면 `localhost` 대신 PC의 LAN IP를 쓴다. 공급자를 바꾸려면 `lib/advice.ts`의 `requestAdvice` 하나만 고치면 된다.

## 구조

- `app/` — Expo Router 화면. `(tabs)/`가 하단 탭(오늘·루틴·기록·통계·설정), `workout/[id]`가 운동 세션, `summary/[id]`가 운동 결과 카드, `routine/[id]`가 루틴 편집, `exercise/[id]`가 종목 상세, `achievements`가 수련부.
- `lib/db.ts` — Supabase 쿼리 전부. 화면은 이 함수들만 호출한다.
- 순수 로직은 DB 없이 시험할 수 있게 떼어 두었다 — `lib/stats.ts`(집계), `lib/gamification.ts`(경험치·품계·업적), `lib/character.ts`(능력치·유형), `lib/advice.ts`(프롬프트·규칙 조언), `lib/exerciseCopy.ts`(소개·조언 문구), `lib/format.ts`.
- `lib/catalog.ts` + `lib/howTo.ts` — 기본 종목 67개와 하는 법.
- `components/` — `BodyMap`(해부도), `OrnateFrame`(금테 장식), `TrainingHall`(수련관), `SetCard`/`BigStepper`(세트 입력) 등.
- `supabase/schema.sql` — 테이블과 RLS 정책. 모든 행은 `auth.uid()` 기준으로 본인 것만 보인다.
- `patches/` — `react-native-body-highlighter`가 SVG에 붙이던 잘못된 prop을 걷어낸다. `npm install` 시 자동 적용된다.

## 검증

```bash
npm run typecheck
```

```bash
npm test
```

`npm test`는 `lib/*.test.ts`를 Node 내장 테스트 러너로 돌린다. DB도 모델도 필요 없다.
