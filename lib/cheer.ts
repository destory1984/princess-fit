/**
 * What 리나 says while you are working out.
 *
 * A screen of numbers and steppers is a spreadsheet; she is the reason it is
 * not. The line is chosen from how far through the session you are, and only
 * from that, so it never flickers between renders — the same board always
 * draws the same words.
 */

export type Cheer = { line: string; done: boolean };

export function cheerFor(doneSets: number, totalSets: number): Cheer {
  if (totalSets === 0) return { line: '종목을 하나 골라볼까요?', done: false };
  if (doneSets === 0) return { line: '첫 세트가 제일 무거워요. 가볍게 시작해요.', done: false };
  if (doneSets >= totalSets) return { line: '다 끝냈어요! 오늘 정말 잘하셨어요.', done: true };

  const left = totalSets - doneSets;
  if (left === 1) return { line: '마지막 한 세트예요. 여기까지 왔잖아요.', done: false };

  const through = doneSets / totalSets;
  if (through >= 0.5) return { line: `절반 넘었어요. ${left}세트 남았어요.`, done: false };
  return { line: `좋아요, 그 속도예요. ${left}세트 남았어요.`, done: false };
}
