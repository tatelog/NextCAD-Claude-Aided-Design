import polygonClipping from 'polygon-clipping'
import { ShapeUtils, Vector2 } from 'three'
// 斜線による段状の切り取り（D-02 C5、A-03 G27 B）。階の天端 z で、境界線から d ≥ (z − 立ち上がり) ÷ 係数 の範囲だけを残す。
// 法規の値（係数・立ち上がり）は呼び出し側が渡す（T-07 の値）。この関数には数値を書かない。
// 切り取りは半平面による Sutherland–Hodgman 法。決定論。座標は mm、交点は 1e-6 mm に丸める。
import { z } from 'zod'
import type { Point } from '../geom/viewport'

export interface SlopeBoundary {
  /** 境界線上の一点（mm） */
  segment?: readonly [Point, Point]
  point: Point
  /** 表示面の端点。計算用の無限境界線とは分け、接道辺の長さを保つ。 */
  displayEdge?: readonly [Point, Point]
  /** 境界線から建物の内側へ向く単位法線 */
  inward: { x: number; y: number }
  /** 斜線の係数（例: 1.25）。0 より大きい */
  coefficient: number
  /** 立ち上がり（mm）。0 以上 */
  riseMm: number
  /** 距離の上限（mm）。道路斜線のように、境界からこの距離を超えれば制限しない（別表第三） */
  maxDistanceMm?: number
  /** どの斜線か（図書の判定を分けるため）。道路・北側・隣地 */
  kind?: 'road' | 'north' | 'adjacent'
}

const BoundarySchema = z.object({
  point: z.object({ x: z.number(), y: z.number() }),
  inward: z.object({ x: z.number(), y: z.number() }).refine((n) => Math.abs(Math.hypot(n.x, n.y) - 1) < 1e-9, {
    message: 'inward は単位法線',
  }),
  coefficient: z.number().positive(),
  riseMm: z.number().min(0),
  maxDistanceMm: z.number().positive().optional(),
  kind: z.enum(['road', 'north', 'adjacent']).optional(),
})

const round = (v: number) => Math.round(v * 1e6) / 1e6

// sign = 1 なら、境界から dist 以上の側（残す側）を残す。sign = −1 なら、dist より境界に近い側（切られる側）を残す（食い込みの部分）
function clipSide(poly: readonly Point[], b: SlopeBoundary, dist: number, sign: 1 | -1): Point[] {
  const f = (p: Point) => sign * (b.inward.x * (p.x - b.point.x) + b.inward.y * (p.y - b.point.y) - dist)
  const cut = (p: Point, q: Point, fp: number, fq: number): Point => {
    const t = fp / (fp - fq)
    return { x: round(p.x + t * (q.x - p.x)), y: round(p.y + t * (q.y - p.y)) }
  }
  const out: Point[] = []
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i]!
    const prev = poly[(i - 1 + poly.length) % poly.length]!
    const fc = f(cur)
    const fp = f(prev)
    if (fc >= 0) {
      if (fp < 0) out.push(cut(prev, cur, fp, fc))
      out.push(cur)
    } else if (fp >= 0) {
      out.push(cut(prev, cur, fp, fc))
    }
  }
  return out.length < 3 ? [] : out
}

function clipHalfPlane(poly: readonly Point[], b: SlopeBoundary, dist: number): Point[] {
  return clipSide(poly, b, dist, 1)
}

// 有限線分からの距離による禁止領域。端点の円弧は外接多角形（最大誤差約0.12%）。
function capsule(edge: readonly [Point, Point], radius: number): Point[] {
  const [a,b]=edge, angle=Math.atan2(b.y-a.y,b.x-a.x), steps=32
  const r=radius/Math.cos(Math.PI/(steps*2))
  const points:Point[]=[]
  for (const [center,start] of [[b,angle-Math.PI/2],[a,angle+Math.PI/2]] as const)
    {
      points.push({x:center.x+radius*Math.cos(start),y:center.y+radius*Math.sin(start)})
      for(let i=0;i<steps;i++) {const t=start+(i+0.5)*Math.PI/steps;points.push({x:center.x+r*Math.cos(t),y:center.y+r*Math.sin(t)})}
      points.push({x:center.x+radius*Math.cos(start+Math.PI),y:center.y+radius*Math.sin(start+Math.PI)})
    }
  return points
}
const ring=(points:readonly Point[]): [number,number][] => points.map(p=>[p.x,p.y])
function unpack(polys: ReturnType<typeof polygonClipping.difference>): Point[][] {
  return polys.flatMap(rings=>{
    const loops=rings.map(r=>r.slice(0,-1).map(([x,y])=>({x,y})))
    if(loops.length===1)return loops
    const vectors=loops.map(ps=>ps.map(p=>new Vector2(p.x,p.y)))
    const flat=loops.flat()
    return ShapeUtils.triangulateShape(vectors[0]!,vectors.slice(1)).map(ids=>ids.map(i=>flat[i]!))
  })
}
function splitByBoundary(poly:Point[],raw:SlopeBoundary,top:number):{kept:Point[][];removed:Point[][]} {
  const b=BoundarySchema.parse(raw)
  if(top<=b.riseMm)return {kept:[poly],removed:[]}
  const dist=Math.min((top-b.riseMm)/b.coefficient,b.maxDistanceMm??Infinity)
  if(raw.segment){
    const forbidden=capsule(raw.segment,dist)
    return {kept:unpack(polygonClipping.difference([ring(poly)],[ring(forbidden)])),removed:unpack(polygonClipping.intersection([ring(poly)],[ring(forbidden)]))}
  }
  const kept=clipHalfPlane(poly,b,dist),removed=clipSide(poly,b,dist,-1)
  return {kept:kept.length?[kept]:[],removed:removed.length?[removed]:[]}
}
export function cutFootprintParts(footprint:readonly Point[],boundaries:readonly SlopeBoundary[],topZMm:number):Point[][] {
  let parts=footprint.length>=3?[footprint.map(p=>({...p}))]:[]
  for(const b of boundaries)parts=parts.flatMap(p=>splitByBoundary(p,b,topZMm).kept)
  return parts
}
export function cutFootprint(footprint:readonly Point[],boundaries:readonly SlopeBoundary[],topZMm:number):Point[] {
  const parts=cutFootprintParts(footprint,boundaries,topZMm)
  if(parts.length>1)throw new Error('切取り後の階が複数に分離しています。単一外形としては扱えません。')
  return parts[0]??[]
}
export function removedPiecesOf(footprint:readonly Point[],boundaries:readonly SlopeBoundary[],topZMm:number):Point[][] {
  let remaining=footprint.length>=3?[footprint.map(p=>({...p}))]:[]
  const removed:Point[][]=[]
  for(const b of boundaries){const next:Point[][]=[];for(const p of remaining){const result=splitByBoundary(p,b,topZMm);next.push(...result.kept);removed.push(...result.removed)}remaining=next}
  return removed
}
export function cutFloorParts(footprint:readonly Point[],boundaries:readonly SlopeBoundary[],storeys:{storey_count:number;storey_height:number}):Point[][][] {
  return Array.from({length:storeys.storey_count},(_,i)=>cutFootprintParts(footprint,boundaries,(i+1)*storeys.storey_height))
}

// 階ごとに切る。天端は (i + 1) × 階高。
export function cutFloors(
  footprint: readonly Point[],
  boundaries: readonly SlopeBoundary[],
  storeys: { storey_count: number; storey_height: number },
): Point[][] {
  return Array.from({ length: storeys.storey_count }, (_, i) =>
    cutFootprint(footprint, boundaries, (i + 1) * storeys.storey_height),
  )
}
