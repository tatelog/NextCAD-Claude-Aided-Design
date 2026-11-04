// 縦シャフトの階ごとの並べ方と、上下階の検査の結果の一行（t61 の残り。G119・G30・G56）。
// 個別に持つ階はその階の値を使い、ほかの階は基準階の複製（G30）。食い違う階は「要確認」として一行に出す。
import type { AlignmentResult, ShaftPlace } from './shaftAlignment'

/** 階ごとの縦シャフト（0 始まり。0 は基準の階）。個別に持つ階はその値、ほかは基準階の複製（G30） */
export function shaftFloorsOf(
  base: readonly ShaftPlace[],
  storeyCount: number,
  individual: Readonly<Record<number, readonly ShaftPlace[]>> = {},
): ShaftPlace[][] {
  return Array.from({ length: Math.max(1, storeyCount) }, (_, f) => [...(f === 0 ? base : (individual[f] ?? base))])
}

/** 検査の結果を画面の一行にする（G119）。食い違う階は 1 始まりの階の番号で出す */
export function shaftNoteOf(result: AlignmentResult): string {
  if (result.aligned) return '縦シャフトは上下階で一致（基準階の複製。G30）'
  return `要確認: ${result.mismatchedFloors.map((f) => `${f + 1} 階`).join('、')}の縦シャフトが基準階と一致しない（G119）`
}
