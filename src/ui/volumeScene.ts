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
