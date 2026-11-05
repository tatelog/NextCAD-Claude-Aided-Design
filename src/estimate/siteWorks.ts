// 外構の面積（ハブ A-03 G63・D-02 C8）。敷地の面積から建築面積を引いた、建物以外の部分。拾い方は仮置き（舗装・植栽の内訳は未決）。決定論。
import type { Point } from '../geom/viewport'
import { polygonAreaMm2 } from '../geom/polygon'
import type { Quantity } from './quantities'

const M2 = 1_000_000

/** 外構（建物以外の敷地）の面積。敷地の面積（mm²）と、建築面積の外形（mm）から。建築面積が敷地より大きければ 0。 */
export function siteWorksQuantity(parcelMm2: number, footprint: readonly Point[]): Quantity {
  const remainMm2 = Math.max(0, parcelMm2 - polygonAreaMm2(footprint))
  return {
    item: '外構（建物以外の敷地）',
    category: '外構',
    quantity: remainMm2 / M2,
    unit: 'm2',
    provisional: true,
  }
}
