// P1 で選んだ筆の形（経緯度の GeoJSON）を、P2 の平面（mm）にする（統括の依頼 2026-11-06。P2 の斜線の基準を、P1 の筆に替える）。決定論。
// 平面は、筆の中心の近くでの正距の近似（経度は cos(緯度) で縮める）。原点は筆の面積の重心。向きは反時計回り。座標は整数の mm。
import type { Point } from '../geom/viewport'

const EARTH_RADIUS_M = 6_371_008.8
const DEG = Math.PI / 180

type LonLat = [number, number]

/** GeoJSON の図形（Polygon か MultiPolygon）から、いちばん広い多角形の外周（経緯度）を取る。穴は使わない */
export function outerRingOf(geometry: unknown): LonLat[] | null {
  if (typeof geometry !== 'object' || geometry === null) return null
  const g = geometry as { type?: unknown; coordinates?: unknown }
  let polygons: unknown[]
  if (g.type === 'Polygon') polygons = [g.coordinates]
  else if (g.type === 'MultiPolygon' && Array.isArray(g.coordinates)) polygons = g.coordinates
  else return null
  let best: LonLat[] | null = null
  let bestArea = -1
  for (const poly of polygons) {
    if (!Array.isArray(poly) || !Array.isArray(poly[0])) continue
    const ring = (poly[0] as unknown[]).filter(
      (p): p is LonLat => Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number',
    )
    if (ring.length < 4) continue
    const area = Math.abs(signedAreaDeg(ring))
    if (area > bestArea) {
      bestArea = area
      best = ring
    }
  }
  return best
}

function signedAreaDeg(ring: LonLat[]): number {
  let s = 0
  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = ring[i]!
    const [x1, y1] = ring[(i + 1) % ring.length]!
    s += x0 * y1 - x1 * y0
  }
  return s / 2
}

/** 筆の外周（経緯度。閉じるための重複の点は外す）。取れないときは null */
export function outerLonLatOf(geometry: unknown): LonLat[] | null {
  const ring = outerRingOf(geometry)
  if (ring === null) return null
  const open = ring.length > 1 && ring[0]![0] === ring[ring.length - 1]![0] && ring[0]![1] === ring[ring.length - 1]![1] ? ring.slice(0, -1) : ring
  return open.length < 3 ? null : open
}

/** 筆の平面の枠（経緯度を平面（mm）に写す式）。基準は筆の頂点の平均（経緯度）。cx・cy は面積の重心の移動量 */
export interface ParcelFrame {
  readonly rotationDeg?: number
  readonly lon0: number
  readonly lat0: number
  readonly kx: number
  readonly ky: number
  readonly cx: number
  readonly cy: number
}

function planarAreaOf(pts: readonly Point[]): number {
  return pts.reduce((s, p, i) => {
    const q = pts[(i + 1) % pts.length]!
    return s + (p.x * q.y - q.x * p.y)
  }, 0)
}

/** 筆の図形から、筆の平面の枠を作る（parcelRingOf と同じ枠）。取れないときは null */
export function parcelFrameOf(geometry: unknown): ParcelFrame | null {
  const open = outerLonLatOf(geometry)
  if (open === null) return null
  const lat0 = open.reduce((s, p) => s + p[1], 0) / open.length
  const lon0 = open.reduce((s, p) => s + p[0], 0) / open.length
  const kx = EARTH_RADIUS_M * DEG * Math.cos(lat0 * DEG) * 1000
  const ky = EARTH_RADIUS_M * DEG * 1000
  const pts: Point[] = open.map(([lon, lat]) => ({ x: (lon - lon0) * kx, y: (lat - lat0) * ky }))
  const area2 = planarAreaOf(pts)
  if (area2 === 0) return null
  const cx = pts.reduce((s, p, i) => {
    const q = pts[(i + 1) % pts.length]!
    return s + (p.x + q.x) * (p.x * q.y - q.x * p.y)
  }, 0) / (3 * area2)
  const cy = pts.reduce((s, p, i) => {
    const q = pts[(i + 1) % pts.length]!
    return s + (p.y + q.y) * (p.x * q.y - q.x * p.y)
  }, 0) / (3 * area2)
  return { lon0, lat0, kx, ky, cx, cy }
}

/**
 * 平面の真北（単位ベクトル）。planeOfLonLat は緯度を y に、経度を x に写すので、北へ動く向きは +y（x は動かない）。
 * 北側斜線（legalBoundaries の trueNorth）に渡す（統括の指示 2026-11-06。5c）
 */
export const PLANE_TRUE_NORTH: { readonly x: number; readonly y: number } = { x: 0, y: 1 }

/** 経緯度を、筆の平面（mm。整数に丸めない）にする。周辺建物も同じ枠で置くと、筆とずれない */
export function planeOfLonLat(frame: ParcelFrame, lon: number, lat: number): Point {
  const x = (lon - frame.lon0) * frame.kx - frame.cx, y = (lat - frame.lat0) * frame.ky - frame.cy
  const a = (frame.rotationDeg ?? 0) * Math.PI / 180
  return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) }
}

/** 筆の図形（GeoJSON）を、筆の重心を原点にした平面（mm）の多角形にする。取れないときは null */
export function parcelRingOf(geometry: unknown): Point[] | null {
  const open = outerLonLatOf(geometry)
  const frame = parcelFrameOf(geometry)
  if (open === null || frame === null) return null
  const unrounded = open.map(([lon, lat]) => planeOfLonLat(frame, lon, lat))
  const pts = unrounded.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
  // 向きは反時計回りにそろえる
  if (planarAreaOf(unrounded) < 0) pts.reverse()
  return pts
}
