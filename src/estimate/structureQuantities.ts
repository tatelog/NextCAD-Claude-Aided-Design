// 躯体の数量（ハブ A-03 G63・D-02 C8）。床版（スラブ）の面積と、床版の下面の型枠の面積。厚さと体積・鉄筋は拾い方が未決のため出さない。決定論。
// 開口（階段・EV）の控除は未決なので、控除していない面積には仮置きの印を立てる。
import type { Point } from '../geom/viewport'
import { polygonAreaMm2 } from '../geom/polygon'
import type { Quantity } from './quantities'
import { DEFAULT_REBAR, REBAR_BASE_T_PER_M3, rebarTPerM3, type RebarCondition } from './rebarCondition'

const M2 = 1_000_000
const M3 = 1_000_000_000

/** 床版の厚さ（mm）の既定。出典が無いので仮置き（A-07 で確認するまで） */
export const SLAB_THICKNESS_MM = 150

/** 鉄筋の量（t/m³）の既定（基準の被り厚 30 mm・重ね継手）。出典が無いので仮置き（A-07 で確認するまで） */
export const REBAR_T_PER_M3 = REBAR_BASE_T_PER_M3

/** 躯体の数量（床版の面積、下面の型枠、床版のコンクリートの体積）。外形（閉じた多角形、mm）と階数から。鉄筋は被り厚と継手の条件で変わる（G86） */
export function structureQuantities(
  footprint: readonly Point[],
  storeys: { storey_count: number; storey_height: number },
  thicknessMm: number = SLAB_THICKNESS_MM,
  rebar: RebarCondition = DEFAULT_REBAR,
): { slab: Quantity; formwork: Quantity; concrete: Quantity; rebar: Quantity } {
  const areaMm2 = polygonAreaMm2(footprint)
  const areaM2 = (areaMm2 / M2) * storeys.storey_count
  return {
    slab: { item: '床版（スラブ）', category: '躯体', quantity: areaM2, unit: 'm2', provisional: true },
    // 床版の下面の型枠は、床版と同じ面積（型枠の厚さや支保工は含めない）
    formwork: { item: '型枠（床版の下面）', category: '躯体', quantity: areaM2, unit: 'm2', provisional: true },
    // コンクリートの体積 = 面積 × 厚さ × 階数（厚さは仮置き）
    concrete: { item: 'コンクリート（床版）', category: '躯体', quantity: (areaMm2 * thicknessMm * storeys.storey_count) / M3, unit: 'm3', provisional: true },
    // 鉄筋の量 = コンクリートの体積 × 鉄筋量（被り厚と継手の条件で変わる。係数は仮置き）
    rebar: { item: '鉄筋（床版）', category: '躯体', quantity: ((areaMm2 * thicknessMm * storeys.storey_count) / M3) * rebarTPerM3(rebar), unit: 't', provisional: true },
  }
}
