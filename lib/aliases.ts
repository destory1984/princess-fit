/**
 * The other names people call these by.
 *
 * From a review of a much larger app: 「기구마다 이름이 달라서 초보자인데 어플에
 * 나온 운동 이름만 보고 찾는데 기구와 이름이 다르니 찾기가 어렵네요 ㅠ 다른
 * 이름들도 같이 있으면 기구 찾기 수월할 거 같아요」. A catalogue that answers to
 * exactly one spelling is a catalogue that looks empty to anyone who learned
 * the movement somewhere else — from a trainer, from a sticker on a machine,
 * from English, or from a friend who says 랫풀.
 *
 * Three kinds of alias live here, and all three come from how people actually
 * type rather than from how the movement is properly named:
 *
 *   the English            bench press, squat, deadlift
 *   the short form         랫풀, 벤치, 데드, 오버헤드
 *   the other Korean       턱걸이 for 풀업, 종아리 for 카프 레이즈, 딥 for 딥스
 *
 * These are only ever *extra* ways in. The name on the card never changes, so
 * nobody has to learn a second vocabulary to read their own history back.
 */

export const ALIASES: Record<string, string[]> = {
  벤치프레스: ['bench press', '벤치', '플랫 벤치', '가슴 기계'],
  '인클라인 벤치프레스': ['incline bench press', '인클라인 벤치', '윗가슴'],
  '디클라인 벤치프레스': ['decline bench press', '디클라인 벤치', '아랫가슴'],
  '덤벨 프레스': ['dumbbell press', '덤벨 벤치', '덤벨 체스트 프레스'],
  '인클라인 덤벨 프레스': ['incline dumbbell press', '인클라인 덤벨'],
  '체스트 프레스 머신': ['chest press', '체스트 프레스', '가슴 머신'],
  '케이블 크로스오버': ['cable crossover', '케이블 플라이', '크로스오버'],
  '펙덱 플라이': ['pec deck', '펙덱', '버터플라이', '나비 머신'],
  푸시업: ['push up', 'pushup', '팔굽혀펴기', '팔굽혀 펴기'],

  데드리프트: ['deadlift', '데드'],
  '루마니안 데드리프트': ['romanian deadlift', 'rdl', '루마니안', '루디'],
  '바벨 로우': ['barbell row', '벤트오버 로우', '바벨로우'],
  '티바 로우': ['t-bar row', 't바 로우', '티바'],
  '랫 풀다운': ['lat pulldown', '랫풀다운', '랫풀', '등 기계'],
  '시티드 로우': ['seated row', '시티드로우', '케이블 로우'],
  풀업: ['pull up', 'pullup', '턱걸이'],
  친업: ['chin up', 'chinup', '언더 턱걸이'],
  '원암 덤벨 로우': ['one arm dumbbell row', '원암 로우', '한팔 덤벨 로우'],
  '백 익스텐션': ['back extension', '백익스텐션', '허리 신전', '척추기립근'],
  슈러그: ['shrug', '슈럭', '승모근'],

  '오버헤드 프레스': ['overhead press', 'ohp', '밀리터리 프레스', '숄더 프레스'],
  '덤벨 숄더 프레스': ['dumbbell shoulder press', '덤벨 어깨', '숄더 프레스'],
  '아놀드 프레스': ['arnold press', '아놀드'],
  '사이드 레터럴 레이즈': ['lateral raise', '레터럴 레이즈', '사레레', '측면 삼각근'],
  '프론트 레이즈': ['front raise', '전면 레이즈'],
  '리어 델트 플라이': ['rear delt fly', '리어 델트', '후면 삼각근', '리어 레이즈'],
  '페이스 풀': ['face pull', '페이스풀'],
  '업라이트 로우': ['upright row', '업라이트로우'],

  스쿼트: ['squat', '바벨 스쿼트', '백 스쿼트'],
  '레그 프레스': ['leg press', '레그프레스', '다리 기계'],
  '레그 익스텐션': ['leg extension', '레그익스텐션', '대퇴사두 기계'],
  '레그 컬': ['leg curl', '레그컬', '햄스트링 기계', '시티드 레그컬'],
  런지: ['lunge'],
  '불가리안 스플릿 스쿼트': ['bulgarian split squat', '불가리안', '스플릿 스쿼트'],
  '힙 쓰러스트': ['hip thrust', '힙쓰러스트', '엉덩이', '둔근'],
  '카프 레이즈': ['calf raise', '카프레이즈', '종아리'],
  스텝업: ['step up', '스텝 업'],
  '점프 스쿼트': ['jump squat', '점프스쿼트'],
  '월 싯': ['wall sit', '월싯', '벽 스쿼트'],
  '케틀벨 스윙': ['kettlebell swing', '케틀벨', '스윙'],

  '바벨 컬': ['barbell curl', '바벨컬', '이두'],
  '덤벨 컬': ['dumbbell curl', '덤벨컬'],
  '해머 컬': ['hammer curl', '해머컬'],
  '프리처 컬': ['preacher curl', '프리처컬'],
  '케이블 컬': ['cable curl', '케이블컬'],
  '리버스 컬': ['reverse curl', '리버스컬', '전완'],
  '트라이셉스 푸시다운': ['triceps pushdown', '푸시다운', '삼두 푸시다운', '케이블 푸시다운'],
  '오버헤드 트라이셉스 익스텐션': ['overhead triceps extension', '삼두 익스텐션', '프렌치 프레스', '트라이셉스 익스텐션'],
  '트라이셉스 킥백': ['triceps kickback', '킥백'],
  딥스: ['dips', 'dip', '딥'],

  크런치: ['crunch'],
  '윗몸 일으키기': ['sit up', 'situp', '윗몸일으키기'],
  '레그 레이즈': ['leg raise', '레그레이즈'],
  '행잉 레그 레이즈': ['hanging leg raise', '행잉 레그레이즈', '철봉 다리'],
  '바이시클 크런치': ['bicycle crunch', '자전거 크런치'],
  '러시안 트위스트': ['russian twist', '러시안트위스트', '복사근'],
  '마운틴 클라이머': ['mountain climber', '마운틴클라이머'],
  플랭크: ['plank'],

  러닝: ['running', 'run', '달리기', '트레드밀', '런닝머신', '러닝머신'],
  걷기: ['walking', 'walk', '산책', '워킹'],
  줄넘기: ['jump rope', '줄 넘기'],
  '계단 오르기': ['stair climber', '스텝밀', '계단'],
  버피: ['burpee', '버피 테스트'],
  수영: ['swimming', 'swim'],
  사이클: ['cycling', 'bike', '자전거', '실내자전거'],
  일립티컬: ['elliptical', '엘립티컬'],
  '로잉 머신': ['rowing machine', 'rower', '로잉', '로워'],
};

/** Every extra spelling this movement answers to, or none. */
export function aliasesOf(name: string): string[] {
  return ALIASES[name] ?? [];
}
