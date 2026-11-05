// 施行令第108条の3 の判定条件（G28 の判定の部品）。外壁の屋外火災保有耐火時間と、開口部の保有遮炎時間を、判定条件と比べる。決定論。
// 注: 延焼防止時間の組み合わせ（外壁と開口部の値を一つの建築物の値にする規則）は、本文で確認できていないため、ここには置かない。
// 判定条件（令108条の3 の写し。第2項第四号ロ・第5項第三号）:
//   外壁: 延焼のおそれのある部分は 60 分以上、それ以外の部分は 30 分以上。
//   開口部設備: 保有遮炎時間が火災の継続時間以上。

export type FireJudgment = '適合' | '不適合' | '判定不能'

/** 外壁の判定。fireMin は屋外火災保有耐火時間（分）。値が無ければ判定不能 */
export function checkWall(wall: { id: string; fireMin: number | undefined; spreadRisk: boolean }): FireJudgment {
  if (wall.fireMin === undefined) return '判定不能'
  const required = wall.spreadRisk ? 60 : 30
  return wall.fireMin >= required ? '適合' : '不適合'
}

/** 開口部設備の判定。holdMin は保有遮炎時間（分）。値が無ければ判定不能 */
export function checkOpening(opening: { id: string; holdMin: number | undefined }, durationMin: number): FireJudgment {
  if (opening.holdMin === undefined) return '判定不能'
  return opening.holdMin >= durationMin ? '適合' : '不適合'
}

/** 全体の判定。不適合が一つでもあれば不適合、次に判定不能、全部適合なら適合 */
export function overallFireCheck(judgments: readonly FireJudgment[]): FireJudgment {
  if (judgments.includes('不適合')) return '不適合'
  if (judgments.includes('判定不能')) return '判定不能'
  return '適合'
}
