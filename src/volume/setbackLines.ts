// 敷地からの離れの寸法線（ハブ A-03 G67・G134 の例外・t72。統括の依頼 2026-11-05）。
// 矩形の敷地と建物の外形（mm。平面）から、北・東・南・西の 4 本の寸法線を作る。決定論。
// 西・東は建物の左右の辺の中ほどの高さ、南・北は中ほどの幅に置く。表記は離れの表記（m・小数 2 桁）。
// 値は setbackFromRectParcel と同じ式（建物が敷地からはみ出すと負）。敷地が矩形でなければ null。
import type { Point } from '../geom/viewport'
import { setbackLabel } from '../plan/dimensionLabel'
import { setbackFromRectParcel } from './placement'

export type SetbackSide = 'north' | 'east' | 'south' | 'west'

export interface SetbackLine {
  side: SetbackSide
  /** 寸法線の始点（平面の mm） */
  from: Point
  /** 寸法線の終点（平面の mm） */
  to: Point
  /** 離れの値（mm。負なら建物が敷地からはみ出す） */
  valueMm: number
  /** 表記（m・小数 2 桁） */
  label: string
}

export function setbackLines(parcel: readonly Point[], building: readonly Point[]): SetbackLine[] | null {
  const setback = setbackFromRectParcel(parcel, building)
  if (!setback) return null
  const pMinX = Math.min(...parcel.map((p) => p.x))
  const pMaxX = Math.max(...parcel.map((p) => p.x))
  const pMinY = Math.min(...parcel.map((p) => p.y))
  const pMaxY = Math.max(...parcel.map((p) => p.y))
  const bMinX = Math.min(...building.map((p) => p.x))
  const bMaxX = Math.max(...building.map((p) => p.x))
  const bMinY = Math.min(...building.map((p) => p.y))
  const bMaxY = Math.max(...building.map((p) => p.y))
  const midX = (bMinX + bMaxX) / 2
  const midY = (bMinY + bMaxY) / 2
  const line = (side: SetbackSide, from: Point, to: Point, valueMm: number): SetbackLine => ({ side, from, to, valueMm, label: setbackLabel(valueMm) })
  return [
    line('west', { x: pMinX, y: midY }, { x: bMinX, y: midY }, setback.west),
    line('east', { x: bMaxX, y: midY }, { x: pMaxX, y: midY }, setback.east),
    line('south', { x: midX, y: pMinY }, { x: midX, y: bMinY }, setback.south),
    line('north', { x: midX, y: bMaxY }, { x: midX, y: pMaxY }, setback.north),
  ]
}
