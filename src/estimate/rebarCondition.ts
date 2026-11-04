// 鉄筋の量の条件（ハブ A-03 G86、統括の決定 2026-11-04）。鉄筋の量（t/m³）は、被り厚と継手（重ね継手かカプラー）で変わる。決定論。
// 係数は仮置き（出典が無い。A-07 で確認するまで）。既定の条件（被り厚 30 mm・重ね継手）は、従来の 0.1 t/m³ と同じ。
export const REBAR_BASE_T_PER_M3 = 0.1

export interface RebarCondition {
  /** 被り厚（mm） */
  coverMm: number
  /** 継手の種類 */
  joint: '重ね継手' | 'カプラー'
}

export const DEFAULT_REBAR: RebarCondition = { coverMm: 30, joint: '重ね継手' }

/** 被り厚 10 mm あたりに増える割合（仮置き） */
const COVER_STEP_RATE = 0.05
/** 継手の係数（仮置き）。重ね継手を基準（1）にする */
const JOINT_FACTOR: Record<RebarCondition['joint'], number> = { 重ね継手: 1, カプラー: 0.95 }

/** 条件から、鉄筋の量（t/m³）を出す。基準の被り厚は 30 mm */
export function rebarTPerM3(c: RebarCondition): number {
  const coverFactor = 1 + COVER_STEP_RATE * ((c.coverMm - 30) / 10)
  return REBAR_BASE_T_PER_M3 * coverFactor * JOINT_FACTOR[c.joint]
}
