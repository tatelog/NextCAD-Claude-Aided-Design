// 外装のサッシの数量（ハブ A-03 G62・D-02 C8）。種類が開口（kind が opening）の線の長さ × 高さで面積を拾う。決定論。
// 高さは決まっていない（出典なし）ので、既定の高さは仮置き。未確定の印を付ける。
import type { Quantity } from './quantities'

/** サッシの高さ（mm）の既定。出典が無いので仮置き（A-07 で確認するまで） */
export const SASH_HEIGHT_MM = 1200

const M2 = 1_000_000

export interface SashSegment {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
}

/** 種類が開口の線の長さ（mm）の合計 × 高さ（mm）を m² で返す。開口が無ければ 0 */
export function sashQuantity(segments: readonly SashSegment[], kindOf: (id: string) => string | null, heightMm: number = SASH_HEIGHT_MM): Quantity {
  const widthMm = segments
    .filter((s) => kindOf(s.id) === 'opening')
    .reduce((sum, s) => sum + Math.hypot(s.x2 - s.x1, s.y2 - s.y1), 0)
  return {
    item: 'サッシ',
    category: '外装',
    quantity: (widthMm * heightMm) / M2,
    unit: 'm2',
    provisional: true,
  }
}
