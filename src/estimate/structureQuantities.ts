// 躯体の数量（ハブ A-03 G63・D-02 C8）。床版（スラブ）の面積だけを拾う。厚さと体積・型枠・鉄筋は拾い方が未決のため出さない。決定論。
// 開口（階段・EV）の控除は未決なので、控除していない面積には仮置きの印を立てる。
import type { Point } from '../geom/viewport'
import { polygonAreaMm2 } from '../geom/polygon'
import type { Quantity } from './quantities'

const M2 = 1_000_000

/** 躯体の数量（床版の面積）。外形（閉じた多角形、mm）と階数から。 */
export function structureQuantities(footprint: readonly Point[], storeys: { storey_count: number; storey_height: number }): { slab: Quantity } {
  return {
    slab: {
      item: '床版（スラブ）',
      category: '躯体',
      quantity: (polygonAreaMm2(footprint) / M2) * storeys.storey_count,
      unit: 'm2',
      provisional: true,
    },
  }
}
