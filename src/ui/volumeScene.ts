// 外形の前から出す 3D（統括の依頼 2026-11-06。4）。外形が閉じていなくても、確定した敷地か周辺建物があれば、それを先に見せる。決定論。
import type { Point } from '../geom/viewport'
import { triangulatePolygon } from '../geom/triangulate'
import type { VolumeMesh } from '../volume/mesh'

/** 敷地の面を、地面より少し上に置く高さ（mm）。地面と重ならないように */
export const LOT_LIFT_MM = 2

/** 3D を出すか。外形（立体）・確定した敷地・周辺建物のどれかがあれば出す */
export function shouldShowScene3DOf(input: { hasVolume: boolean; hasLot: boolean; neighborCount: number }): boolean {
  return input.hasVolume || input.hasLot || input.neighborCount > 0
}

/** 敷地の面の三角形（mm）。平面（x・y）の座標は外形と同じで、高さだけ地面より少し上 */
export function lotPlateTrianglesOf(lot: readonly Point[]): VolumeMesh['triangles'] {
  return triangulatePolygon(lot).map(([a, b, c]) => [
    { x: a.x, y: a.y, z: LOT_LIFT_MM },
    { x: b.x, y: b.y, z: LOT_LIFT_MM },
    { x: c.x, y: c.y, z: LOT_LIFT_MM },
  ])
}

/** 範囲に合わせるカメラ（統括の依頼 2026-11-06。B）。目標・球の半径・カメラの位置（いずれも m。y は上向き） */
export interface SceneFrame {
  target: [number, number, number]
  radiusM: number
  distanceM: number
  position: [number, number, number]
}

const DEFAULT_VIEW_OFFSET = [40, 40, 50]
const FRAME_MARGIN = 1.15

/** 範囲（平面 mm の多角形の並び）に合わせるカメラを決める。範囲が無ければ null。目標は範囲の中心、カメラは既定の向きのまま、球が縦の視野（fovDeg）に入る距離に置く */
export function sceneFrameOf(polygonsMm: readonly (readonly Point[])[], fovDeg: number): SceneFrame | null {
  const pts = polygonsMm.flat()
  if (pts.length === 0) return null
  const M = 1 / 1000
  const xs = pts.map((p) => p.x * M)
  const zs = pts.map((p) => p.y * M)
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2
  const radiusM = Math.max(1, ...pts.map((p) => Math.hypot(p.x * M - cx, p.y * M - cz)))
  const distanceM = (radiusM / Math.sin((fovDeg / 2) * (Math.PI / 180))) * FRAME_MARGIN
  const len = Math.hypot(...DEFAULT_VIEW_OFFSET)
  const [ox, oy, oz] = DEFAULT_VIEW_OFFSET.map((v) => (v / len) * distanceM)
  return {
    target: [cx, 0, cz],
    radiusM,
    distanceM,
    position: [cx + ox!, oy!, cz + oz!],
  }
}
