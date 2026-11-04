// 敷地との離れの数値に合わせて建物を移す（D-04 P2、A-03 G67）。西と南の離れを入れる。北と東は建物の大きさで決まる。
// 敷地が矩形でないときは移さない（離れは未定義。G67 で未決）。
import type { Point } from '../geom/viewport'
import { setbackFromRectParcel } from './placement'

export function placeBySetback(building: readonly Point[], parcel: readonly Point[], target: { west: number; south: number }): Point[] {
  const now = setbackFromRectParcel(parcel, building)
  if (now === null) return building.map((p) => ({ x: p.x, y: p.y }))
  const dx = target.west - now.west
  const dy = target.south - now.south
  return building.map((p) => ({ x: p.x + dx, y: p.y + dy }))
}
