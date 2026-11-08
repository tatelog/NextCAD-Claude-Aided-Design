// 躯体の数量（ハブ A-03 G63・D-02 C8）。床版面積・下面型枠・指定厚200mmのコンクリート体積・概算鉄筋量。
// 開口（階段・EV）の控除は未決なので、控除していない面積には仮置きの印を立てる。
import type { Point } from '../geom/viewport'
import { polygonAreaMm2 } from '../geom/polygon'
import type { Quantity } from './quantities'
import { DEFAULT_REBAR, REBAR_BASE_T_PER_M3, rebarTPerM3, type RebarCondition } from './rebarCondition'

const M2 = 1_000_000
const M3 = 1_000_000_000

/** 床版の厚さ（mm）は利用者指定の計画条件 */
export { SLAB_THICKNESS_MM } from '../plan/buildingDimensions'
import { SLAB_THICKNESS_MM } from '../plan/buildingDimensions'

/** 鉄筋の量（t/m³）の既定（基準の被り厚 30 mm・重ね継手）。出典が無いので仮置き（A-07 で確認するまで） */
export const REBAR_T_PER_M3 = REBAR_BASE_T_PER_M3

/** 躯体の数量（床版の面積、下面の型枠、床版のコンクリートの体積）。外形（閉じた多角形、mm）と階数から。鉄筋は被り厚と継手の条件で変わる（G86）。
 * 切り取った階の面積（floorAreasMm2）があれば、その和に合わせる（統括の依頼 2026-11-06。依頼 5a）。無ければ 外形 × 階数 */
export function structureQuantities(
  footprint: readonly Point[],
  storeys: { storey_count: number; storey_height: number },
  thicknessMm: number = SLAB_THICKNESS_MM,
  rebar: RebarCondition = DEFAULT_REBAR,
  floorAreasMm2?: readonly number[],
): { slab: Quantity; formwork: Quantity; concrete: Quantity; rebar: Quantity } {
  const areaMm2 = polygonAreaMm2(footprint)
  // 床版の体積の基になる面積（mm²）。切り取りがあれば階の面積の和、無ければ 外形 × 階数
  const storeyAreaSumMm2 = floorAreasMm2 === undefined ? undefined : floorAreasMm2.reduce((sum, a) => sum + a, 0)
  const areaM2 = storeyAreaSumMm2 === undefined ? (areaMm2 / M2) * storeys.storey_count : storeyAreaSumMm2 / M2
  return {
    slab: { item: '床版（スラブ）', category: '躯体', quantity: areaM2, unit: 'm2', provisional: true },
    // 床版の下面の型枠は、床版と同じ面積（型枠の厚さや支保工は含めない）
    formwork: { item: '型枠（床版の下面）', category: '躯体', quantity: areaM2, unit: 'm2', provisional: true },
    // コンクリートの体積 = 各階の床版面積の合計 × 指定厚
    concrete: {
      item: 'コンクリート（床版）',
      category: '躯体',
      quantity: storeyAreaSumMm2 === undefined ? (areaMm2 * thicknessMm * storeys.storey_count) / M3 : (storeyAreaSumMm2 * thicknessMm) / M3,
      unit: 'm3',
      provisional: true,
    },
    // 鉄筋の量 = コンクリートの体積 × 鉄筋量（被り厚と継手の条件で変わる。係数は仮置き）
    rebar: {
      item: '鉄筋（床版）',
      category: '躯体',
      quantity:
        (storeyAreaSumMm2 === undefined ? (areaMm2 * thicknessMm * storeys.storey_count) / M3 : (storeyAreaSumMm2 * thicknessMm) / M3) * rebarTPerM3(rebar),
      unit: 't',
      provisional: true,
    },
  }
}
