// 筆界のダミー（P1 の筆界が入るまでの仮の敷地。反時計回り。辺 0 は下の辺）。20 m × 30 m = 600 m²。
// P3 の建蔽率・離れと、P4 の外構の面積で同じ敷地を使う。仮置きなので、P1 の筆界が入ったら置き換える。
import type { Point } from '../geom/viewport'

export const DUMMY_PARCEL_MM2 = 20_000 * 30_000

export const DUMMY_PARCEL: Point[] = [
  { x: 0, y: 0 },
  { x: 20_000, y: 0 },
  { x: 20_000, y: 30_000 },
  { x: 0, y: 30_000 },
]
