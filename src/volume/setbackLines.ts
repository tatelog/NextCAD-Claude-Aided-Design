// 敷地からの離れの寸法線（ハブ A-03 G67・G134 の例外・t72。統括の依頼 2026-11-05）。
// 矩形の敷地と建物の外形（mm。平面）から、北・東・南・西の 4 本の寸法線を作る。決定論。
// 西・東は建物の左右の辺の中ほどの高さ、南・北は中ほどの幅に置く。表記は離れの表記（m・小数 2 桁）。
// 値は setbackFromRectParcel と同じ式（建物が敷地からはみ出すと負）。敷地が矩形でなければ null。
import type { Point } from '../geom/viewport'
import { setbackLabel } from '../plan/dimensionLabel'
import { setbackFromRectParcel } from './placement'

export type SetbackSide = 'north' | 'east' | 'south' | 'west' | `edge-${number}`

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

/** 各境界線分と建物外周の最短距離。鍵型・回転敷地にも対応する。 */
export function boundaryDistances(parcel: readonly Point[], building: readonly Point[]): SetbackLine[] | null {
  if(parcel.length<3 || building.length<3)return null
  const project=(p:Point,a:Point,b:Point):Point=>{const dx=b.x-a.x,dy=b.y-a.y;const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return {x:a.x+t*dx,y:a.y+t*dy}}
  return parcel.map((a,i)=>{
    const b=parcel[(i+1)%parcel.length]!
    let from=a,to=building[0]!,distance=Infinity
    const take=(p:Point,q:Point)=>{const d=Math.hypot(p.x-q.x,p.y-q.y);if(d<distance){from=p;to=q;distance=d}}
    building.forEach((c,j)=>{const d=building[(j+1)%building.length]!;take(project(c,a,b),c);take(project(d,a,b),d);take(a,project(a,c,d));take(b,project(b,c,d))
      const ux=b.x-a.x,uy=b.y-a.y,vx=d.x-c.x,vy=d.y-c.y,den=ux*vy-uy*vx
      if(Math.abs(den)>1e-9){const t=((c.x-a.x)*vy-(c.y-a.y)*vx)/den,u=((c.x-a.x)*uy-(c.y-a.y)*ux)/den;if(t>=0&&t<=1&&u>=0&&u<=1){const p={x:a.x+t*ux,y:a.y+t*uy};take(p,p)}}
    })
    return {side:`edge-${i}` as const,from,to,valueMm:distance,label:setbackLabel(distance)}
  })
}

export function previewSetbackLines(parcel: readonly Point[], building: readonly Point[]) {
  return setbackLines(parcel,building) ?? boundaryDistances(parcel,building)
}
