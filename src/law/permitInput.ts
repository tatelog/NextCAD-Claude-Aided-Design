import type { Volume } from '../volume/extrude'
import type { PermitInput } from './permitRequired'

/** 案件のうち、ボリュームから決まらない条件（構造・用途・敷地の区域・設備・申請の形） */
export type PermitProject = Omit<PermitInput, 'storeys' | 'heightM' | 'totalFloorAreaM2'>

// 高さ・階数・延べ面積はボリュームの値から毎回決める（条件は可変）。
// 高さ = 階数 × 階高（D-02 C5 の仮置き）。延べ面積 = 各階の建築面積の合計（斜線などで切り取る前）。
export function permitInputFromVolume(volume: Volume, project: PermitProject): PermitInput {
  return {
    ...project,
    storeys: volume.storey_count,
    heightM: volume.total_height / 1000,
    totalFloorAreaM2: volume.gross_floor_area_mm2 / 1_000_000,
  }
}
