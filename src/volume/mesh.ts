// 押し出しの立体メッシュ（D-02 C5）。3D 表示（D-04 P2 の主画面、G42）に渡す三角形の列。単位は mm。
// 入力の検証と高さ・面積は extrudeVolume と同じ（ここでは二重に持たない）。
import { triangulatePolygon } from '../geom/triangulate'
import { polygonAreaMm2 } from '../geom/polygon'
import { extrudeVolume, type ExtrudeInput } from './extrude'

export interface Vertex3 {
  x: number
  y: number
  z: number
}

export interface VolumeMesh {
  total_height: number
  triangles: [Vertex3, Vertex3, Vertex3][]
}

export function buildVolumeMesh(input: ExtrudeInput): VolumeMesh {
  const v = extrudeVolume(input)
  return { total_height: v.total_height, triangles: prismTriangles(v.footprint, 0, v.total_height) }
}

/** 底面の多角形を、base から base + height まで押し出した立体の三角形。検証はしない（呼び出し側が確かめる） */
function prismTriangles(footprint: readonly Point2[], base: number, height: number): VolumeMesh['triangles'] {
  const h = base + height
  const bottom = (p: Point2): Vertex3 => ({ x: p.x, y: p.y, z: base })
  const top = (p: Point2): Vertex3 => ({ x: p.x, y: p.y, z: h })

  const triangles: VolumeMesh['triangles'] = []
  for (const [a, b, c] of triangulatePolygon(footprint)) {
    triangles.push([bottom(a), bottom(c), bottom(b)])
    triangles.push([top(a), top(b), top(c)])
  }

  const n = footprint.length
  for (let i = 0; i < n; i++) {
    const a = footprint[i]!
    const b = footprint[(i + 1) % n]!
    triangles.push([bottom(a), bottom(b), top(b)])
    triangles.push([bottom(a), top(b), top(a)])
  }
  return triangles
}

/**
 * 段状に切った階を、階ごとに積み上げた立体にする（D-04 P2「段状に切った後のボリューム」）。
 * 各階は、床の形（その階の天端での切り口）を、その階の高さ（storeyHeightMm）だけ押し出し、天端の高さ（heightMm）まで積む。
 */
export function stackedMesh(floors: readonly { footprint: readonly Point2[]; heightMm: number }[], storeyHeightMm: number): VolumeMesh {
  const triangles: VolumeMesh['triangles'] = []
  for (const f of floors) {
    // 壊れた階は立体にしない（画面を落とさない。理由は floorProblemOf）。切り口の座標は斜線の交点で小数になるので、整数の検証はしない
    if (floorProblemOf(f, storeyHeightMm) !== null) continue
    triangles.push(...prismTriangles(f.footprint, f.heightMm - storeyHeightMm, storeyHeightMm))
  }
  return { total_height: floors.length > 0 ? floors[floors.length - 1]!.heightMm : 0, triangles }
}

/** 階の形が立体にならない理由（立体にできれば null）。点が 3 つ未満・数でない座標・面積が 0 など */
export function floorProblemOf(f: { footprint: readonly Point2[]; heightMm: number }, storeyHeightMm: number): string | null {
  if (!(storeyHeightMm >= 1) || !Number.isFinite(storeyHeightMm)) return '階高が不正'
  if (!Number.isFinite(f.heightMm)) return '天端の高さが数でない'
  if (f.footprint.length < 3) return '点が 3 つ未満（斜線で切り取られて残らない）'
  if (f.footprint.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return '座標が数でない'
  if (Math.abs(polygonAreaMm2(f.footprint)) < 1) return '面積が 0（線になる）'
  return null
}

type Point2 = { x: number; y: number }
