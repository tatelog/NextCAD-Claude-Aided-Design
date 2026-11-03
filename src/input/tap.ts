// ダブルタップの判定（G52: 右クリックかダブルタップでサークルメニュー）。
// 300 ms・30 px は仕様に無い仮置き。判定は時刻と位置だけで行い、入力の種類では分けない。
export const DOUBLE_TAP_MS = 300
export const DOUBLE_TAP_PX = 30

export interface TapRecord {
  /** 時刻（ms） */
  t: number
  x: number
  y: number
}

export interface TapResult {
  /** この 1 回のタップがダブルタップか */
  double: boolean
  /** 次の判定に渡す記録。ダブルタップのあとは null にして 3 回目を新しい 1 回目にする */
  next: TapRecord | null
}

export function nextTap(prev: TapRecord | null, tap: TapRecord): TapResult {
  if (prev && tap.t - prev.t <= DOUBLE_TAP_MS && Math.hypot(tap.x - prev.x, tap.y - prev.y) <= DOUBLE_TAP_PX) {
    return { double: true, next: null }
  }
  return { double: false, next: tap }
}
