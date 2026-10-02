/**
 * The exercises the app ships with, as plain data.
 *
 * Kept apart from the seeding in `./catalog` so tests — and anything else that
 * only wants the names — can import it without dragging in the database.
 */
import type { TrackType } from './types.ts';
import { HOW_TO } from './howTo.ts';

export type CatalogEntry = {
  name: string;
  muscle_group: string;
  secondary_group: string | null;
  equipment: string;
  muscle_detail: string;
  body_parts: string;
  track_type: TrackType;
  how_to: string;
};

const ENTRIES: Omit<CatalogEntry, 'how_to'>[] = [
  { name: '벤치프레스', muscle_group: '가슴', secondary_group: '팔', equipment: '바벨', muscle_detail: '대흉근, 삼두', body_parts: 'chest,triceps,deltoids' , track_type: 'weight_reps' },
  { name: '인클라인 벤치프레스', muscle_group: '가슴', secondary_group: '어깨', equipment: '바벨', muscle_detail: '대흉근 상부, 삼각근', body_parts: 'chest,deltoids,triceps' , track_type: 'weight_reps' },
  { name: '덤벨 프레스', muscle_group: '가슴', secondary_group: '팔', equipment: '덤벨', muscle_detail: '대흉근, 삼두', body_parts: 'chest,triceps' , track_type: 'weight_reps' },
  { name: '체스트 프레스 머신', muscle_group: '가슴', secondary_group: '팔', equipment: '머신', muscle_detail: '대흉근, 삼두', body_parts: 'chest,triceps' , track_type: 'weight_reps' },
  { name: '케이블 크로스오버', muscle_group: '가슴', secondary_group: null, equipment: '케이블', muscle_detail: '대흉근', body_parts: 'chest' , track_type: 'weight_reps' },
  { name: '푸시업', muscle_group: '가슴', secondary_group: '팔', equipment: '맨몸', muscle_detail: '대흉근, 삼두', body_parts: 'chest,triceps' , track_type: 'weight_reps' },

  { name: '데드리프트', muscle_group: '등', secondary_group: '하체', equipment: '바벨', muscle_detail: '척추기립근, 둔근, 햄스트링', body_parts: 'lower-back,gluteal,hamstring,trapezius' , track_type: 'weight_reps' },
  { name: '바벨 로우', muscle_group: '등', secondary_group: '팔', equipment: '바벨', muscle_detail: '광배근, 승모근', body_parts: 'upper-back,trapezius,biceps' , track_type: 'weight_reps' },
  { name: '랫 풀다운', muscle_group: '등', secondary_group: '팔', equipment: '머신', muscle_detail: '광배근, 이두', body_parts: 'upper-back,biceps' , track_type: 'weight_reps' },
  { name: '시티드 로우', muscle_group: '등', secondary_group: '팔', equipment: '머신', muscle_detail: '광배근, 승모근', body_parts: 'upper-back,trapezius' , track_type: 'weight_reps' },
  { name: '풀업', muscle_group: '등', secondary_group: '팔', equipment: '맨몸', muscle_detail: '광배근, 이두', body_parts: 'upper-back,biceps' , track_type: 'weight_reps' },
  { name: '원암 덤벨 로우', muscle_group: '등', secondary_group: '팔', equipment: '덤벨', muscle_detail: '광배근', body_parts: 'upper-back' , track_type: 'weight_reps' },

  { name: '오버헤드 프레스', muscle_group: '어깨', secondary_group: '팔', equipment: '바벨', muscle_detail: '삼각근, 삼두', body_parts: 'deltoids,triceps' , track_type: 'weight_reps' },
  { name: '덤벨 숄더 프레스', muscle_group: '어깨', secondary_group: '팔', equipment: '덤벨', muscle_detail: '삼각근, 삼두', body_parts: 'deltoids,triceps' , track_type: 'weight_reps' },
  { name: '사이드 레터럴 레이즈', muscle_group: '어깨', secondary_group: null, equipment: '덤벨', muscle_detail: '삼각근 측면', body_parts: 'deltoids' , track_type: 'weight_reps' },
  { name: '페이스 풀', muscle_group: '어깨', secondary_group: '등', equipment: '케이블', muscle_detail: '후면 삼각근, 승모근', body_parts: 'deltoids,trapezius' , track_type: 'weight_reps' },
  { name: '리어 델트 플라이', muscle_group: '어깨', secondary_group: '등', equipment: '덤벨', muscle_detail: '후면 삼각근', body_parts: 'deltoids,upper-back' , track_type: 'weight_reps' },

  { name: '스쿼트', muscle_group: '하체', secondary_group: '복근', equipment: '바벨', muscle_detail: '대퇴사두, 둔근', body_parts: 'quadriceps,gluteal' , track_type: 'weight_reps' },
  { name: '레그 프레스', muscle_group: '하체', secondary_group: null, equipment: '머신', muscle_detail: '대퇴사두, 둔근', body_parts: 'quadriceps,gluteal' , track_type: 'weight_reps' },
  { name: '런지', muscle_group: '하체', secondary_group: null, equipment: '덤벨', muscle_detail: '대퇴사두, 둔근', body_parts: 'quadriceps,gluteal' , track_type: 'weight_reps' },
  { name: '레그 익스텐션', muscle_group: '하체', secondary_group: null, equipment: '머신', muscle_detail: '대퇴사두', body_parts: 'quadriceps' , track_type: 'weight_reps' },
  { name: '레그 컬', muscle_group: '하체', secondary_group: null, equipment: '머신', muscle_detail: '햄스트링', body_parts: 'hamstring' , track_type: 'weight_reps' },
  { name: '루마니안 데드리프트', muscle_group: '하체', secondary_group: '등', equipment: '바벨', muscle_detail: '햄스트링, 둔근', body_parts: 'hamstring,gluteal,lower-back' , track_type: 'weight_reps' },
  { name: '힙 쓰러스트', muscle_group: '하체', secondary_group: null, equipment: '바벨', muscle_detail: '둔근', body_parts: 'gluteal' , track_type: 'weight_reps' },
  { name: '카프 레이즈', muscle_group: '하체', secondary_group: null, equipment: '머신', muscle_detail: '종아리', body_parts: 'calves' , track_type: 'weight_reps' },

  { name: '바벨 컬', muscle_group: '팔', secondary_group: null, equipment: '바벨', muscle_detail: '이두', body_parts: 'biceps' , track_type: 'weight_reps' },
  { name: '덤벨 컬', muscle_group: '팔', secondary_group: null, equipment: '덤벨', muscle_detail: '이두', body_parts: 'biceps' , track_type: 'weight_reps' },
  { name: '해머 컬', muscle_group: '팔', secondary_group: null, equipment: '덤벨', muscle_detail: '이두, 전완', body_parts: 'biceps,forearm' , track_type: 'weight_reps' },
  { name: '트라이셉스 푸시다운', muscle_group: '팔', secondary_group: null, equipment: '케이블', muscle_detail: '삼두', body_parts: 'triceps' , track_type: 'weight_reps' },
  { name: '오버헤드 트라이셉스 익스텐션', muscle_group: '팔', secondary_group: null, equipment: '덤벨', muscle_detail: '삼두', body_parts: 'triceps' , track_type: 'weight_reps' },
  { name: '딥스', muscle_group: '팔', secondary_group: '가슴', equipment: '맨몸', muscle_detail: '삼두, 대흉근 하부', body_parts: 'triceps,chest' , track_type: 'weight_reps' },

  { name: '크런치', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '복직근', body_parts: 'abs' , track_type: 'weight_reps' },
  { name: '윗몸 일으키기', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '복직근', body_parts: 'abs' , track_type: 'weight_reps' },
  { name: '레그 레이즈', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '하복부', body_parts: 'abs' , track_type: 'weight_reps' },
  { name: '행잉 레그 레이즈', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '하복부', body_parts: 'abs' , track_type: 'weight_reps' },
  { name: '바이시클 크런치', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '복직근, 복사근', body_parts: 'abs,obliques' , track_type: 'weight_reps' },
  { name: '러시안 트위스트', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '복사근', body_parts: 'obliques' , track_type: 'weight_reps' },
  { name: '마운틴 클라이머', muscle_group: '복근', secondary_group: '유산소', equipment: '맨몸', muscle_detail: '복직근, 심폐', body_parts: 'abs,quadriceps' , track_type: 'weight_reps' },
  { name: '플랭크', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '복직근, 코어', body_parts: 'abs,obliques' , track_type: 'duration' },

  { name: '인클라인 덤벨 프레스', muscle_group: '가슴', secondary_group: '어깨', equipment: '덤벨', muscle_detail: '대흉근 상부, 삼각근', body_parts: 'chest,deltoids' , track_type: 'weight_reps' },
  { name: '디클라인 벤치프레스', muscle_group: '가슴', secondary_group: '팔', equipment: '바벨', muscle_detail: '대흉근 하부, 삼두', body_parts: 'chest,triceps' , track_type: 'weight_reps' },
  { name: '펙덱 플라이', muscle_group: '가슴', secondary_group: null, equipment: '머신', muscle_detail: '대흉근', body_parts: 'chest' , track_type: 'weight_reps' },

  { name: '친업', muscle_group: '등', secondary_group: '팔', equipment: '맨몸', muscle_detail: '광배근, 이두', body_parts: 'upper-back,biceps' , track_type: 'weight_reps' },
  { name: '티바 로우', muscle_group: '등', secondary_group: '팔', equipment: '머신', muscle_detail: '광배근, 승모근', body_parts: 'upper-back,trapezius,biceps' , track_type: 'weight_reps' },
  { name: '백 익스텐션', muscle_group: '등', secondary_group: '하체', equipment: '맨몸', muscle_detail: '척추기립근, 둔근', body_parts: 'lower-back,gluteal' , track_type: 'weight_reps' },
  { name: '슈러그', muscle_group: '등', secondary_group: null, equipment: '덤벨', muscle_detail: '승모근', body_parts: 'trapezius' , track_type: 'weight_reps' },

  { name: '아놀드 프레스', muscle_group: '어깨', secondary_group: '팔', equipment: '덤벨', muscle_detail: '삼각근, 삼두', body_parts: 'deltoids,triceps' , track_type: 'weight_reps' },
  { name: '업라이트 로우', muscle_group: '어깨', secondary_group: '등', equipment: '바벨', muscle_detail: '삼각근, 승모근', body_parts: 'deltoids,trapezius' , track_type: 'weight_reps' },
  { name: '프론트 레이즈', muscle_group: '어깨', secondary_group: null, equipment: '덤벨', muscle_detail: '전면 삼각근', body_parts: 'deltoids' , track_type: 'weight_reps' },

  { name: '불가리안 스플릿 스쿼트', muscle_group: '하체', secondary_group: null, equipment: '덤벨', muscle_detail: '대퇴사두, 둔근', body_parts: 'quadriceps,gluteal' , track_type: 'weight_reps' },
  { name: '스텝업', muscle_group: '하체', secondary_group: null, equipment: '덤벨', muscle_detail: '대퇴사두, 둔근', body_parts: 'quadriceps,gluteal' , track_type: 'weight_reps' },
  { name: '점프 스쿼트', muscle_group: '하체', secondary_group: '유산소', equipment: '맨몸', muscle_detail: '대퇴사두, 둔근', body_parts: 'quadriceps,gluteal,calves' , track_type: 'weight_reps' },
  { name: '월 싯', muscle_group: '하체', secondary_group: null, equipment: '맨몸', muscle_detail: '대퇴사두', body_parts: 'quadriceps' , track_type: 'duration' },
  { name: '케틀벨 스윙', muscle_group: '하체', secondary_group: '등', equipment: '기타', muscle_detail: '둔근, 햄스트링', body_parts: 'gluteal,hamstring,lower-back' , track_type: 'weight_reps' },

  // The glutes had exactly one movement that named them as the target — 힙
  // 쓰러스트 — and everything else reached them on the way to the quads. A
  // review of a much larger app put it plainly: 「엉덩이 관련 운동이 하나도
  // 없어요. 넣어주세요」. Six that train them on purpose, one for each place
  // someone might be standing: a floor, a cable tower, a machine, a bar.
  { name: '글루트 브릿지', muscle_group: '하체', secondary_group: null, equipment: '맨몸', muscle_detail: '둔근', body_parts: 'gluteal' , track_type: 'weight_reps' },
  { name: '케이블 킥백', muscle_group: '하체', secondary_group: null, equipment: '케이블', muscle_detail: '둔근', body_parts: 'gluteal' , track_type: 'weight_reps' },
  { name: '힙 어브덕션 머신', muscle_group: '하체', secondary_group: null, equipment: '머신', muscle_detail: '둔근', body_parts: 'gluteal' , track_type: 'weight_reps' },
  { name: '덩키 킥', muscle_group: '하체', secondary_group: null, equipment: '맨몸', muscle_detail: '둔근', body_parts: 'gluteal' , track_type: 'weight_reps' },
  { name: '스모 데드리프트', muscle_group: '하체', secondary_group: '등', equipment: '바벨', muscle_detail: '둔근, 햄스트링, 내측 대퇴', body_parts: 'gluteal,hamstring,quadriceps' , track_type: 'weight_reps' },
  { name: '굿모닝', muscle_group: '하체', secondary_group: '등', equipment: '바벨', muscle_detail: '햄스트링, 둔근, 척추기립근', body_parts: 'hamstring,gluteal,lower-back' , track_type: 'weight_reps' },

  { name: '프리처 컬', muscle_group: '팔', secondary_group: null, equipment: '바벨', muscle_detail: '이두', body_parts: 'biceps' , track_type: 'weight_reps' },
  { name: '케이블 컬', muscle_group: '팔', secondary_group: null, equipment: '케이블', muscle_detail: '이두', body_parts: 'biceps' , track_type: 'weight_reps' },
  { name: '트라이셉스 킥백', muscle_group: '팔', secondary_group: null, equipment: '덤벨', muscle_detail: '삼두', body_parts: 'triceps' , track_type: 'weight_reps' },
  { name: '리버스 컬', muscle_group: '팔', secondary_group: null, equipment: '바벨', muscle_detail: '전완, 이두', body_parts: 'forearm,biceps' , track_type: 'weight_reps' },

  { name: '러닝', muscle_group: '유산소', secondary_group: '하체', equipment: '맨몸', muscle_detail: '심폐, 하체', body_parts: 'quadriceps,calves' , track_type: 'cardio' },
  { name: '걷기', muscle_group: '유산소', secondary_group: '하체', equipment: '맨몸', muscle_detail: '심폐, 하체', body_parts: 'quadriceps,calves' , track_type: 'duration' },
  { name: '줄넘기', muscle_group: '유산소', secondary_group: '하체', equipment: '맨몸', muscle_detail: '심폐, 종아리', body_parts: 'calves,quadriceps' , track_type: 'duration' },
  { name: '계단 오르기', muscle_group: '유산소', secondary_group: '하체', equipment: '맨몸', muscle_detail: '심폐, 둔근', body_parts: 'gluteal,quadriceps' , track_type: 'floors' },
  { name: '버피', muscle_group: '유산소', secondary_group: '하체', equipment: '맨몸', muscle_detail: '전신, 심폐', body_parts: 'quadriceps,chest,abs' , track_type: 'weight_reps' },
  { name: '수영', muscle_group: '유산소', secondary_group: '등', equipment: '맨몸', muscle_detail: '전신, 심폐', body_parts: 'upper-back,deltoids' , track_type: 'cardio' },
  { name: '사이클', muscle_group: '유산소', secondary_group: '하체', equipment: '머신', muscle_detail: '심폐, 대퇴사두', body_parts: 'quadriceps' , track_type: 'cardio' },
  { name: '일립티컬', muscle_group: '유산소', secondary_group: '하체', equipment: '머신', muscle_detail: '심폐, 하체', body_parts: 'quadriceps,gluteal' , track_type: 'cardio' },
  { name: '천국의 계단', muscle_group: '유산소', secondary_group: '하체', equipment: '머신', muscle_detail: '심폐, 둔근', body_parts: 'gluteal,quadriceps' , track_type: 'cardio' },
  { name: '로잉 머신', muscle_group: '유산소', secondary_group: '등', equipment: '머신', muscle_detail: '심폐, 광배근', body_parts: 'upper-back,quadriceps' , track_type: 'duration' },

  // At home the gear is whatever fits under a bed: a wheel, a band, one
  // kettlebell, a pair of push-up handles. All filed under 기타 so the home
  // filter (plan.ts HOME_EQUIPMENT) keeps them.
  { name: 'AB 슬라이드', muscle_group: '복근', secondary_group: '어깨', equipment: '기타', muscle_detail: '복직근, 코어', body_parts: 'abs,obliques,deltoids' , track_type: 'weight_reps' },
  { name: '사이드 플랭크', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '복사근, 코어', body_parts: 'obliques,abs' , track_type: 'duration' },
  { name: '밴드 로우', muscle_group: '등', secondary_group: '팔', equipment: '기타', muscle_detail: '광배근, 능형근', body_parts: 'upper-back,biceps' , track_type: 'weight_reps' },
  { name: '밴드 풀 어파트', muscle_group: '어깨', secondary_group: '등', equipment: '기타', muscle_detail: '후면 삼각근, 능형근', body_parts: 'deltoids,upper-back' , track_type: 'weight_reps' },
  { name: '케틀벨 고블릿 스쿼트', muscle_group: '하체', secondary_group: '복근', equipment: '기타', muscle_detail: '대퇴사두, 둔근', body_parts: 'quadriceps,gluteal' , track_type: 'weight_reps' },
  { name: '푸시업 바 푸시업', muscle_group: '가슴', secondary_group: '팔', equipment: '기타', muscle_detail: '대흉근, 삼두', body_parts: 'chest,triceps' , track_type: 'weight_reps' },

  // Added 2026-10-03 (docs/direction.md, 기본기 1): the first set of a session
  // is where a missing movement loses someone. Machines and the bodyweight
  // versions were the thinnest parts of the list.
  { name: '덤벨 플라이', muscle_group: '가슴', secondary_group: null, equipment: '덤벨', muscle_detail: '대흉근', body_parts: 'chest', track_type: 'weight_reps' },
  { name: '인클라인 덤벨 플라이', muscle_group: '가슴', secondary_group: '어깨', equipment: '덤벨', muscle_detail: '대흉근 상부', body_parts: 'chest,deltoids', track_type: 'weight_reps' },
  { name: '스미스 머신 벤치프레스', muscle_group: '가슴', secondary_group: '팔', equipment: '머신', muscle_detail: '대흉근, 삼두', body_parts: 'chest,triceps,deltoids', track_type: 'weight_reps' },
  { name: '인클라인 체스트 프레스 머신', muscle_group: '가슴', secondary_group: '어깨', equipment: '머신', muscle_detail: '대흉근 상부, 삼각근', body_parts: 'chest,deltoids', track_type: 'weight_reps' },
  { name: '디클라인 푸시업', muscle_group: '가슴', secondary_group: '어깨', equipment: '맨몸', muscle_detail: '대흉근 상부, 삼각근', body_parts: 'chest,deltoids', track_type: 'weight_reps' },
  { name: '니 푸시업', muscle_group: '가슴', secondary_group: '팔', equipment: '맨몸', muscle_detail: '대흉근, 삼두', body_parts: 'chest,triceps', track_type: 'weight_reps' },
  { name: '덤벨 풀오버', muscle_group: '가슴', secondary_group: '등', equipment: '덤벨', muscle_detail: '대흉근, 광배근', body_parts: 'chest,upper-back', track_type: 'weight_reps' },
  { name: '로우 케이블 플라이', muscle_group: '가슴', secondary_group: '어깨', equipment: '케이블', muscle_detail: '대흉근 상부', body_parts: 'chest,deltoids', track_type: 'weight_reps' },
  { name: '클로즈 그립 벤치프레스', muscle_group: '팔', secondary_group: '가슴', equipment: '바벨', muscle_detail: '삼두, 대흉근', body_parts: 'triceps,chest', track_type: 'weight_reps' },
  { name: '어시스트 풀업 머신', muscle_group: '등', secondary_group: '팔', equipment: '머신', muscle_detail: '광배근, 이두', body_parts: 'upper-back,biceps', track_type: 'weight_reps' },
  { name: '스트레이트 암 풀다운', muscle_group: '등', secondary_group: null, equipment: '케이블', muscle_detail: '광배근', body_parts: 'upper-back', track_type: 'weight_reps' },
  { name: '클로즈 그립 랫 풀다운', muscle_group: '등', secondary_group: '팔', equipment: '케이블', muscle_detail: '광배근 아래쪽, 이두', body_parts: 'upper-back,biceps', track_type: 'weight_reps' },
  { name: '인버티드 로우', muscle_group: '등', secondary_group: '팔', equipment: '맨몸', muscle_detail: '광배근, 능형근', body_parts: 'upper-back,biceps', track_type: 'weight_reps' },
  { name: '펜들레이 로우', muscle_group: '등', secondary_group: '팔', equipment: '바벨', muscle_detail: '광배근, 척추기립근', body_parts: 'upper-back,lower-back,biceps', track_type: 'weight_reps' },
  { name: '벤트오버 덤벨 로우', muscle_group: '등', secondary_group: '팔', equipment: '덤벨', muscle_detail: '광배근, 능형근', body_parts: 'upper-back,biceps', track_type: 'weight_reps' },
  { name: '체스트 서포티드 로우', muscle_group: '등', secondary_group: '팔', equipment: '덤벨', muscle_detail: '능형근, 광배근', body_parts: 'upper-back,biceps', track_type: 'weight_reps' },
  { name: '하이 로우 머신', muscle_group: '등', secondary_group: '팔', equipment: '머신', muscle_detail: '광배근, 능형근', body_parts: 'upper-back,biceps', track_type: 'weight_reps' },
  { name: '랙 풀', muscle_group: '등', secondary_group: '하체', equipment: '바벨', muscle_detail: '척추기립근, 승모근, 둔근', body_parts: 'lower-back,trapezius,gluteal', track_type: 'weight_reps' },
  { name: '덤벨 슈러그', muscle_group: '등', secondary_group: null, equipment: '덤벨', muscle_detail: '승모근', body_parts: 'trapezius', track_type: 'weight_reps' },
  { name: '슈퍼맨', muscle_group: '등', secondary_group: '하체', equipment: '맨몸', muscle_detail: '척추기립근, 둔근', body_parts: 'lower-back,gluteal', track_type: 'weight_reps' },
  { name: '파머스 워크', muscle_group: '등', secondary_group: '팔', equipment: '덤벨', muscle_detail: '전완, 승모근, 코어', body_parts: 'forearm,trapezius,abs', track_type: 'duration' },
  { name: '숄더 프레스 머신', muscle_group: '어깨', secondary_group: '팔', equipment: '머신', muscle_detail: '삼각근, 삼두', body_parts: 'deltoids,triceps', track_type: 'weight_reps' },
  { name: '스미스 머신 숄더 프레스', muscle_group: '어깨', secondary_group: '팔', equipment: '머신', muscle_detail: '삼각근, 삼두', body_parts: 'deltoids,triceps', track_type: 'weight_reps' },
  { name: '케이블 레터럴 레이즈', muscle_group: '어깨', secondary_group: null, equipment: '케이블', muscle_detail: '측면 삼각근', body_parts: 'deltoids', track_type: 'weight_reps' },
  { name: '레터럴 레이즈 머신', muscle_group: '어깨', secondary_group: null, equipment: '머신', muscle_detail: '측면 삼각근', body_parts: 'deltoids', track_type: 'weight_reps' },
  { name: '리버스 펙덱 플라이', muscle_group: '어깨', secondary_group: '등', equipment: '머신', muscle_detail: '후면 삼각근, 능형근', body_parts: 'deltoids,upper-back', track_type: 'weight_reps' },
  { name: '파이크 푸시업', muscle_group: '어깨', secondary_group: '팔', equipment: '맨몸', muscle_detail: '삼각근, 삼두', body_parts: 'deltoids,triceps', track_type: 'weight_reps' },
  { name: '랜드마인 프레스', muscle_group: '어깨', secondary_group: '가슴', equipment: '바벨', muscle_detail: '삼각근, 대흉근 상부', body_parts: 'deltoids,chest,triceps', track_type: 'weight_reps' },
  { name: '푸시 프레스', muscle_group: '어깨', secondary_group: '하체', equipment: '바벨', muscle_detail: '삼각근, 삼두, 대퇴사두', body_parts: 'deltoids,triceps,quadriceps', track_type: 'weight_reps' },
  { name: 'Y 레이즈', muscle_group: '어깨', secondary_group: '등', equipment: '덤벨', muscle_detail: '하부 승모근, 삼각근', body_parts: 'deltoids,trapezius', track_type: 'weight_reps' },
  { name: '프론트 스쿼트', muscle_group: '하체', secondary_group: '복근', equipment: '바벨', muscle_detail: '대퇴사두, 둔근, 코어', body_parts: 'quadriceps,gluteal,abs', track_type: 'weight_reps' },
  { name: '핵 스쿼트', muscle_group: '하체', secondary_group: null, equipment: '머신', muscle_detail: '대퇴사두, 둔근', body_parts: 'quadriceps,gluteal', track_type: 'weight_reps' },
  { name: '스미스 머신 스쿼트', muscle_group: '하체', secondary_group: null, equipment: '머신', muscle_detail: '대퇴사두, 둔근', body_parts: 'quadriceps,gluteal', track_type: 'weight_reps' },
  { name: '덤벨 고블릿 스쿼트', muscle_group: '하체', secondary_group: '복근', equipment: '덤벨', muscle_detail: '대퇴사두, 둔근', body_parts: 'quadriceps,gluteal', track_type: 'weight_reps' },
  { name: '덤벨 스쿼트', muscle_group: '하체', secondary_group: null, equipment: '덤벨', muscle_detail: '대퇴사두, 둔근', body_parts: 'quadriceps,gluteal', track_type: 'weight_reps' },
  { name: '맨몸 스쿼트', muscle_group: '하체', secondary_group: null, equipment: '맨몸', muscle_detail: '대퇴사두, 둔근', body_parts: 'quadriceps,gluteal', track_type: 'weight_reps' },
  { name: '스플릿 스쿼트', muscle_group: '하체', secondary_group: null, equipment: '맨몸', muscle_detail: '대퇴사두, 둔근', body_parts: 'quadriceps,gluteal', track_type: 'weight_reps' },
  { name: '워킹 런지', muscle_group: '하체', secondary_group: null, equipment: '덤벨', muscle_detail: '대퇴사두, 둔근', body_parts: 'quadriceps,gluteal,hamstring', track_type: 'weight_reps' },
  { name: '리버스 런지', muscle_group: '하체', secondary_group: null, equipment: '맨몸', muscle_detail: '대퇴사두, 둔근', body_parts: 'quadriceps,gluteal', track_type: 'weight_reps' },
  { name: '사이드 런지', muscle_group: '하체', secondary_group: null, equipment: '맨몸', muscle_detail: '대퇴사두, 둔근, 내측 대퇴', body_parts: 'quadriceps,gluteal', track_type: 'weight_reps' },
  { name: '덤벨 루마니안 데드리프트', muscle_group: '하체', secondary_group: '등', equipment: '덤벨', muscle_detail: '햄스트링, 둔근', body_parts: 'hamstring,gluteal,lower-back', track_type: 'weight_reps' },
  { name: '싱글 레그 데드리프트', muscle_group: '하체', secondary_group: null, equipment: '덤벨', muscle_detail: '햄스트링, 둔근', body_parts: 'hamstring,gluteal', track_type: 'weight_reps' },
  { name: '트랩바 데드리프트', muscle_group: '하체', secondary_group: '등', equipment: '바벨', muscle_detail: '대퇴사두, 둔근, 척추기립근', body_parts: 'quadriceps,gluteal,lower-back', track_type: 'weight_reps' },
  { name: '시티드 레그 컬', muscle_group: '하체', secondary_group: null, equipment: '머신', muscle_detail: '햄스트링', body_parts: 'hamstring', track_type: 'weight_reps' },
  { name: '시티드 카프 레이즈', muscle_group: '하체', secondary_group: null, equipment: '머신', muscle_detail: '종아리 가자미근', body_parts: 'calves', track_type: 'weight_reps' },
  { name: '싱글 레그 글루트 브릿지', muscle_group: '하체', secondary_group: null, equipment: '맨몸', muscle_detail: '둔근, 햄스트링', body_parts: 'gluteal,hamstring', track_type: 'weight_reps' },
  { name: '케이블 풀 스루', muscle_group: '하체', secondary_group: '등', equipment: '케이블', muscle_detail: '둔근, 햄스트링', body_parts: 'gluteal,hamstring', track_type: 'weight_reps' },
  { name: '노르딕 햄스트링 컬', muscle_group: '하체', secondary_group: null, equipment: '맨몸', muscle_detail: '햄스트링', body_parts: 'hamstring', track_type: 'weight_reps' },
  { name: '박스 점프', muscle_group: '하체', secondary_group: null, equipment: '기타', muscle_detail: '대퇴사두, 둔근, 종아리', body_parts: 'quadriceps,gluteal,calves', track_type: 'weight_reps' },
  { name: '파워 클린', muscle_group: '하체', secondary_group: '등', equipment: '바벨', muscle_detail: '둔근, 대퇴사두, 승모근', body_parts: 'gluteal,quadriceps,trapezius', track_type: 'weight_reps' },
  { name: '덤벨 스러스터', muscle_group: '하체', secondary_group: '어깨', equipment: '덤벨', muscle_detail: '대퇴사두, 둔근, 삼각근', body_parts: 'quadriceps,gluteal,deltoids', track_type: 'weight_reps' },
  { name: '인클라인 덤벨 컬', muscle_group: '팔', secondary_group: null, equipment: '덤벨', muscle_detail: '이두', body_parts: 'biceps', track_type: 'weight_reps' },
  { name: '컨센트레이션 컬', muscle_group: '팔', secondary_group: null, equipment: '덤벨', muscle_detail: '이두', body_parts: 'biceps', track_type: 'weight_reps' },
  { name: '이지바 컬', muscle_group: '팔', secondary_group: null, equipment: '바벨', muscle_detail: '이두, 전완', body_parts: 'biceps,forearm', track_type: 'weight_reps' },
  { name: '암 컬 머신', muscle_group: '팔', secondary_group: null, equipment: '머신', muscle_detail: '이두', body_parts: 'biceps', track_type: 'weight_reps' },
  { name: '로프 해머 컬', muscle_group: '팔', secondary_group: null, equipment: '케이블', muscle_detail: '이두, 전완', body_parts: 'biceps,forearm', track_type: 'weight_reps' },
  { name: '스컬 크러셔', muscle_group: '팔', secondary_group: null, equipment: '바벨', muscle_detail: '삼두', body_parts: 'triceps', track_type: 'weight_reps' },
  { name: '케이블 오버헤드 트라이셉스 익스텐션', muscle_group: '팔', secondary_group: null, equipment: '케이블', muscle_detail: '삼두 장두', body_parts: 'triceps', track_type: 'weight_reps' },
  { name: '벤치 딥스', muscle_group: '팔', secondary_group: '어깨', equipment: '맨몸', muscle_detail: '삼두', body_parts: 'triceps,deltoids', track_type: 'weight_reps' },
  { name: '다이아몬드 푸시업', muscle_group: '팔', secondary_group: '가슴', equipment: '맨몸', muscle_detail: '삼두, 대흉근', body_parts: 'triceps,chest', track_type: 'weight_reps' },
  { name: '트라이셉스 딥 머신', muscle_group: '팔', secondary_group: '가슴', equipment: '머신', muscle_detail: '삼두', body_parts: 'triceps,chest', track_type: 'weight_reps' },
  { name: '리스트 컬', muscle_group: '팔', secondary_group: null, equipment: '덤벨', muscle_detail: '전완', body_parts: 'forearm', track_type: 'weight_reps' },
  { name: '케이블 크런치', muscle_group: '복근', secondary_group: null, equipment: '케이블', muscle_detail: '복직근', body_parts: 'abs', track_type: 'weight_reps' },
  { name: '앱 크런치 머신', muscle_group: '복근', secondary_group: null, equipment: '머신', muscle_detail: '복직근', body_parts: 'abs', track_type: 'weight_reps' },
  { name: '리버스 크런치', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '복직근 하부', body_parts: 'abs', track_type: 'weight_reps' },
  { name: '데드버그', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '코어', body_parts: 'abs', track_type: 'weight_reps' },
  { name: '버드독', muscle_group: '복근', secondary_group: '등', equipment: '맨몸', muscle_detail: '코어, 척추기립근', body_parts: 'abs,lower-back', track_type: 'weight_reps' },
  { name: '브이 업', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '복직근', body_parts: 'abs', track_type: 'weight_reps' },
  { name: '할로우 홀드', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '코어', body_parts: 'abs', track_type: 'duration' },
  { name: '플러터 킥', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '복직근 하부', body_parts: 'abs', track_type: 'weight_reps' },
  { name: '토즈 투 바', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '복직근, 장요근', body_parts: 'abs', track_type: 'weight_reps' },
  { name: '케이블 우드찹', muscle_group: '복근', secondary_group: null, equipment: '케이블', muscle_detail: '복사근', body_parts: 'obliques,abs', track_type: 'weight_reps' },
  { name: '인클라인 워킹', muscle_group: '유산소', secondary_group: '하체', equipment: '머신', muscle_detail: '심폐, 둔근, 종아리', body_parts: 'gluteal,calves', track_type: 'duration' },
  { name: '등산', muscle_group: '유산소', secondary_group: '하체', equipment: '맨몸', muscle_detail: '심폐, 하체', body_parts: 'quadriceps,gluteal,calves', track_type: 'duration' },
  { name: '점핑 잭', muscle_group: '유산소', secondary_group: '어깨', equipment: '맨몸', muscle_detail: '심폐, 전신', body_parts: 'calves,deltoids', track_type: 'duration' },
  { name: '하이 니', muscle_group: '유산소', secondary_group: '복근', equipment: '맨몸', muscle_detail: '심폐, 장요근', body_parts: 'quadriceps,abs', track_type: 'duration' },
  { name: '에어 바이크', muscle_group: '유산소', secondary_group: '어깨', equipment: '머신', muscle_detail: '심폐, 전신', body_parts: 'quadriceps,deltoids', track_type: 'duration' },
  { name: '배틀 로프', muscle_group: '유산소', secondary_group: '어깨', equipment: '기타', muscle_detail: '심폐, 삼각근, 코어', body_parts: 'deltoids,abs', track_type: 'duration' },
  { name: '섀도 복싱', muscle_group: '유산소', secondary_group: '어깨', equipment: '맨몸', muscle_detail: '심폐, 삼각근', body_parts: 'deltoids,abs', track_type: 'duration' },
];

/**
 * Adds any missing default exercises and backfills catalog metadata onto rows
 * that predate it, matched by name. Rows the user has already annotated are
 * left alone.
 */
export const DEFAULT_EXERCISES: CatalogEntry[] = ENTRIES.map((e) => ({
  ...e,
  how_to: HOW_TO[e.name] ?? '',
}));

