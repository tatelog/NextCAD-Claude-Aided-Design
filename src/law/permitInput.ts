import type { Volume } from '../volume/extrude'
import type { PermitInput } from './permitRequired'

/** 案件のうち、ボリュームから決まらない条件（構造・用途・敷地の区域・設備・申請の形） */
export type PermitProject = Omit<PermitInput, 'storeys' | 'heightM' | 'totalFloorAreaM2' | 'areaAbove31M2'>

// 高さ・階数・延べ面積はボリュームの値から毎回決める（条件は可変）。
// 高さ = 階数 × 階高（D-02 C5 の仮置き）。延べ面積 = 各階の建築面積の合計（斜線などで切り取る前）。
// 31m 超の部分の床面積 = 高さ 31m を超える階（階の上端が 31m を超える）の建築面積の合計（簡易: 階の全体を数える）。
const HIGH_M = 31

export function permitInputFromVolume(volume: Volume, project: PermitProject): PermitInput {
  let floorsAbove = 0
  for (let k = 1; k <= volume.storey_count; k++) {
    if (k * volume.storey_height > HIGH_M * 1000) floorsAbove++
  }
  return {
    ...project,
    storeys: volume.storey_count,
    heightM: volume.total_height / 1000,
    totalFloorAreaM2: volume.gross_floor_area_mm2 / 1_000_000,
    areaAbove31M2: (floorsAbove * volume.building_area_mm2) / 1_000_000,
  }
}
