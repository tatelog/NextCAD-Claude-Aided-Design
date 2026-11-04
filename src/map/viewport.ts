// P1 の地図の表示（D-04 P1）。中心・ズーム・表示の大きさ（768 px）から、タイルの位置と画面の点を決める。決定論。
// 表示の左上が画面の原点（px）。中心の点は表示の中央に出る。地図の範囲（緯度 ±85.05°、ズーム 0〜18）を超えない。
import { lonLatFromWorldPixel, worldPixel } from './worldPixel'

export const VIEW_PX = 768
export const TILE_PX = 256
export const MAX_ZOOM = 18
const MAX_LAT = 85.05112878
// これ未満の動きはクリック、これ以上はドラッグ（px）
const CLICK_PX = 4

export interface LonLat {
  lon: number
  lat: number
}

export interface Point {
  x: number
  y: number
}

export interface TileOnView {
  x: number
  y: number
  /** タイルの左端の画面上の位置（px） */
  dx: number
  /** タイルの上端の画面上の位置（px） */
  dy: number
}

export function clampZoom(z: number): number {
  if (!Number.isFinite(z)) return 0
  return Math.min(MAX_ZOOM, Math.max(0, Math.floor(z)))
}

/** 表示の左上のワールド座標（px） */
export function viewOrigin(center: LonLat, zoom: number): Point {
  const w = worldPixel(center, zoom)
  return { x: w.x - VIEW_PX / 2, y: w.y - VIEW_PX / 2 }
}

export function worldToScreen(point: LonLat, center: LonLat, zoom: number): Point {
  const o = viewOrigin(center, zoom)
  const w = worldPixel(point, zoom)
  return { x: w.x - o.x, y: w.y - o.y }
}

export function screenToLonLat(x: number, y: number, center: LonLat, zoom: number): LonLat {
  const o = viewOrigin(center, zoom)
  return lonLatFromWorldPixel({ x: o.x + x, y: o.y + y }, zoom)
}

/** 表示を覆うタイル（番号は範囲の外も含む。描く前に tileOnMap で直す） */
export function tilesInView(center: LonLat, zoom: number): TileOnView[] {
  const o = viewOrigin(center, zoom)
  const x0 = Math.floor(o.x / TILE_PX)
  const x1 = Math.floor((o.x + VIEW_PX - 1) / TILE_PX)
  const y0 = Math.floor(o.y / TILE_PX)
  const y1 = Math.floor((o.y + VIEW_PX - 1) / TILE_PX)
  const out: TileOnView[] = []
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      out.push({ x, y, dx: x * TILE_PX - o.x, dy: y * TILE_PX - o.y })
    }
  }
  return out
}

/** タイルの番号を地図の範囲に直す。横は世界の端で繋がり、縦は範囲の外なら null */
export function tileOnMap(t: { x: number; y: number }, zoom: number): { x: number; y: number } | null {
  const n = 2 ** zoom
  if (t.y < 0 || t.y >= n) return null
  return { x: ((t.x % n) + n) % n, y: t.y }
}

/** ドラッグの分だけ中心を動かす（dx, dy は画面の動き。右・下へ動かすと中心は西・北へ動く） */
export function panCenter(center: LonLat, zoom: number, dx: number, dy: number): LonLat {
  const w = worldPixel(center, zoom)
  const p = lonLatFromWorldPixel({ x: w.x - dx, y: w.y - dy }, zoom)
  return {
    lon: Math.min(180, Math.max(-180, p.lon)),
    lat: Math.min(MAX_LAT, Math.max(-MAX_LAT, p.lat)),
  }
}

export function isClick(from: Point, to: Point): boolean {
  return Math.hypot(to.x - from.x, to.y - from.y) < CLICK_PX
}

// ホイールの 1 段（px）。たまった分は持ち越す
export const WHEEL_STEP_PX = 100

/** ホイールの動き（deltaY）をたまった分に足し、段数と持ち越す分を返す。段数は deltaY の符号のまま（上へ回すと負） */
export function wheelZoomSteps(accumulated: number, deltaY: number): { steps: number; rest: number } {
  const total = accumulated + deltaY
  const steps = Math.trunc(total / WHEEL_STEP_PX)
  return { steps, rest: total - steps * WHEEL_STEP_PX }
}

/** 経緯度の入力を地点にする。空・数でない・範囲外は null */
export function parseSitePoint(lonText: string, latText: string): LonLat | null {
  if (lonText.trim() === '' || latText.trim() === '') return null
  const lon = Number(lonText)
  const lat = Number(latText)
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null
  if (lon < -180 || lon > 180 || lat < -MAX_LAT || lat > MAX_LAT) return null
  return { lon, lat }
}
