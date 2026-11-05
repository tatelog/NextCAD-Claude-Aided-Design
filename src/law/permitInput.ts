import type { Volume } from '../volume/extrude'
import type { PermitInput } from './permitRequired'

/** 案件のうち、ボリュームから決まらない条件（敷地の区域・設備・申請の形）。構造と用途は持たない（下の固定値） */
export type PermitProject = Omit<PermitInput, 'storeys' | 'heightM' | 'totalFloorAreaM2' | 'areaAbove31M2' | 'storeysAbove31' | 'structure' | 'usage'>

// このアプリの対象は RC 造の板状マンション（AGENTS.md）。構造と用途は入力させず固定する（統括の指示 2026-11-06）
export const APP_STRUCTURE = 'RC' as const
export const APP_USAGE = '共同住宅'

// 高さ・階数・延べ面積はボリュームの値から毎回決める（条件は可変）。
// 高さ = 階数 × 階高（D-02 C5 の仮置き）。延べ面積 = 各階の建築面積の合計（斜線などで切り取る前）。
// 31m 超の部分（施行令129条の13の2 第2号の床面積・第3号の階数）は、31m の線を少しでも超える階を、またぐ階も含めて数える。
// 条文には書いていない実務の扱い（代表の指示 2026-11-06）。床面積はその階の建築面積の全体を数える。
const HIGH_M = 31

export function permitInputFromVolume(volume: Volume, project: PermitProject): PermitInput {
  let floorsAbove = 0
  for (let k = 1; k <= volume.storey_count; k++) {
    if (k * volume.storey_height > HIGH_M * 1000) floorsAbove++
  }
  return {
    ...project,
    structure: APP_STRUCTURE,
    usage: APP_USAGE,
    storeys: volume.storey_count,
    heightM: volume.total_height / 1000,
    totalFloorAreaM2: volume.gross_floor_area_mm2 / 1_000_000,
    areaAbove31M2: (floorsAbove * volume.building_area_mm2) / 1_000_000,
    storeysAbove31: floorsAbove,
  }
}
