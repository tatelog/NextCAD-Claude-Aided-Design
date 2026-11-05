// 次へを押したときの確かめ（代表の決定 G158: 止めない。問題の一覧を出し、直すか、このまま進むかを利用者が選ぶ）。決定論。
// 画面の値は呼び出し側が渡す。ここでは、問題の並びと「進む」か「見直す」かだけを決める。
// 文言は D-04 の各画面の項目の言葉に合わせる（外形・斜線・日影・段状の形・通り・住戸数・住戸の定義・縦シャフト・廊下幅・要確認・単価未設定・未確定）。

/** 確かめで見つかった一件（どの項目か・何が問題か） */
export interface CheckIssue {
  area: string
  text: string
}

/** 次へを押したときの動き: 問題が無ければ進む、あれば見直す（止めはしない。選ぶのは利用者） */
export function nextGateOf(issues: readonly CheckIssue[]): 'go' | 'review' {
  return issues.length === 0 ? 'go' : 'review'
}

export interface P2NextInput {
  /** 外形が閉じているか */
  closed: boolean
  /** 閉合の表示（閉じていないときの理由を含む） */
  closureText: string
  /** 斜線の適合・超過（判定する規則が無ければ null） */
  slope: '適合' | '超過' | null
  /** 日影の適合・不適合（判定できなければ null） */
  shadow: '適合' | '不適合' | null
  /** 日影の表示（判定できないときの理由を含む） */
  shadowText: string
  /** 立体にできなかった階（階の番号は 1 始まり） */
  brokenFloors: readonly { floor: number; reason: string }[]
}

/** P2（外形・斜線・日影・段状の形）の問題 */
export function p2NextIssuesOf(input: P2NextInput): CheckIssue[] {
  const issues: CheckIssue[] = []
  if (!input.closed) issues.push({ area: '外形', text: input.closureText })
  if (input.slope === '超過') issues.push({ area: '斜線', text: '斜線: 超過（外形が斜線の外に出ている）' })
  // 外形が閉じていないときは、斜線と日影は判定できない（閉合の一件で伝える。同じことを二度出さない）
  if (input.closed && input.slope === null) issues.push({ area: '斜線', text: '判定する規則が無い（用途地域と容積率を入れる）' })
  if (input.shadow === '不適合') issues.push({ area: '日影', text: input.shadowText })
  if (input.shadow === null && input.closed) issues.push({ area: '日影', text: input.shadowText })
  for (const b of input.brokenFloors) issues.push({ area: '段状の形', text: `${b.floor} 階は立体にできない（${b.reason}）` })
  return issues
}

export interface P3NextInput {
  /** 通りの判定（範囲に入るか。範囲が無いときは ok 扱い） */
  spanJudge: 'ok' | '無理' | string
  /** 住戸の数 */
  unitCount: number
  /** 住戸の定義のエラー（閉じないとき） */
  unitError: string | null
  /** 縦シャフトの上下階が揃うか（確かめられないときは null） */
  shaftAligned: boolean | null
  /** 廊下幅（mm） */
  corridorMm: number
  /** 要確認の線（意味づけ）の数 */
  reviewCount: number
  /** 仮の間口の列の数（要確認） */
  provisionalSpanCount: number
}

/** P3（通り・住戸数・住戸の定義・縦シャフト・廊下幅・要確認）の問題 */
export function p3NextIssuesOf(input: P3NextInput): CheckIssue[] {
  const issues: CheckIssue[] = []
  if (input.spanJudge === '無理') issues.push({ area: '通り', text: '通りが範囲に入らない（無理な通り）' })
  if (input.unitCount === 0) issues.push({ area: '住戸数', text: '住戸が無い（戸数と間取りパターンを入れて、自動で作る）' })
  // 住戸の定義のエラーの中身（検証の文字）は出さない。入力の数値を直す案内に置き換える（画面の一覧は読めることを優先）
  if (input.unitError !== null) issues.push({ area: '住戸の定義', text: '住戸の定義が閉じない（入力の数値を確かめてください）' })
  if (input.shaftAligned === false) issues.push({ area: '縦シャフト', text: '縦シャフトの上下階が揃わない' })
  if (!(input.corridorMm > 0)) issues.push({ area: '廊下幅', text: '廊下幅が正しくない（0 より大きい数）' })
  if (input.reviewCount > 0) issues.push({ area: '要確認', text: `意味づけの要確認が ${input.reviewCount} 件` })
  if (input.provisionalSpanCount > 0) issues.push({ area: '要確認', text: `仮の間口の列が ${input.provisionalSpanCount} 列` })
  return issues
}

export interface P4NextInput {
  /** 単価が未設定の品目（品目の名前） */
  laborUnset: readonly string[]
  /** 未確定（出典なし・仮置き）の品目（品目の名前） */
  provisional: readonly string[]
}

/** P4（単価未設定・未確定の品目）の問題 */
export function p4NextIssuesOf(input: P4NextInput): CheckIssue[] {
  return [
    ...input.laborUnset.map((text) => ({ area: '単価未設定', text })),
    ...input.provisional.map((text) => ({ area: '未確定', text })),
  ]
}
