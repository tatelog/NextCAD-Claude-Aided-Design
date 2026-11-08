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
export function prismTriangles(footprint: readonly Point2[], base: number, height: number): VolumeMesh['triangles'] {
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

/** 階の形が立体にならない種類（一覧の文言は確かめの関数が決める。理由の英文はそのままの文字） */
export type FloorProblemKind = 'height' | 'top' | 'fewPoints' | 'coordinate' | 'area'

const FLOOR_PROBLEM_TEXT: Record<FloorProblemKind, string> = {
  height: '階高が不正',
  top: '天端の高さが数でない',
  fewPoints: '点が 3 つ未満（斜線で切り取られて残らない）',
  coordinate: '座標が数でない',
  area: '面積が 0（線になる）',
}

/** 階の形が立体にならない種類（立体にできれば null）。点が 3 つ未満・数でない座標・面積が 0 など */
export function floorProblemKindOf(f: { footprint: readonly Point2[]; heightMm: number }, storeyHeightMm: number): FloorProblemKind | null {
  if (!(storeyHeightMm >= 1) || !Number.isFinite(storeyHeightMm)) return 'height'
  if (!Number.isFinite(f.heightMm)) return 'top'
  if (f.footprint.length < 3) return 'fewPoints'
  if (f.footprint.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return 'coordinate'
  if (Math.abs(polygonAreaMm2(f.footprint)) < 1) return 'area'
  return null
}

/** 階の形が立体にならない理由の文（立体にできれば null）。文は floorProblemKindOf の種類に対応する */
export function floorProblemOf(f: { footprint: readonly Point2[]; heightMm: number }, storeyHeightMm: number): string | null {
  const kind = floorProblemKindOf(f, storeyHeightMm)
  return kind === null ? null : FLOOR_PROBLEM_TEXT[kind]
}

/**
 * 立体にできない階を、階の番号（1 始まり）と種類で集める。点が 0 の階（全部削られた階）は出さない（統括の依頼 2026-11-06）。
 */
export function brokenFloorsOf(
  floors: readonly { footprint: readonly Point2[]; heightMm: number }[],
  storeyHeightMm: number,
): { floor: number; kind: FloorProblemKind }[] {
  return floors.flatMap((f, i) => {
    if (f.footprint.length === 0) return []
    const kind = floorProblemKindOf(f, storeyHeightMm)
    return kind === null ? [] : [{ floor: i + 1, kind }]
  })
}

type Point2 = { x: number; y: number }
