// 保存の版番号による確認（ハブ A-03 G32・D-03 §4「同時書き込みの方式」）。決定論。
// 案件のファイルの版（revision）を、読んだ版と保存先の版で比べる。同じ（または保存先が無い）なら保存し、違えば上書きせず衝突として返す。
// 衝突の扱い（読み直す・どちらを残すか）は人が決める。ここでは決めない。

export interface SaveDecisionInput {
  /** 読んだときの版（新しく作った案件は 0） */
  loadedRevision: number
  /** 保存先にいま在る版。保存先が無いときは null。版が読めないときは NaN */
  remoteRevision: number | null
}

/** 保存してよいか（'save'）、衝突か（'conflict'） */
export function decideSave(input: SaveDecisionInput): 'save' | 'conflict' {
  if (input.remoteRevision === null) return 'save'
  return input.remoteRevision === input.loadedRevision ? 'save' : 'conflict'
}

/** 保存のあとの版。いまの版 + 1 */
export function nextRevision(current: number): number {
  return current + 1
}
