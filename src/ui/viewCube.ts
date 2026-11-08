// ビューキューブの向き（代表の依頼 2026-11-06。3）。六面・十二辺・八隅の 26 の向きと、カメラに向いている面・辺・隅の画面上の位置。
// 三次元の座標は three と同じ（x 右・y 上・z 手前）。正面は南（−z）、背面は北（+z）、右は +x、左は −x。
// キューブはカメラの向きに合わせて投影する（カメラと一緒に回る）。
import { cameraForFace, type Face } from './viewFaces'

export interface Dir {
  x: number
  y: number
  z: number
}

export type CubeKind = 'face' | 'edge' | 'corner'

export interface CubeTarget {
  kind: CubeKind
  id: string
  /** この向きから見る（単位長さ）。注視点から、カメラがある方向 */
  dir: Dir
  /** 面の見出し（六面だけ） */
  label?: string
}

const FACE_IDS: Face[] = ['top', 'bottom', 'front', 'back', 'left', 'right']
const FACE_LABEL: Record<Face, string> = { top: '上', bottom: '下', front: '正面', back: '背面', left: '左', right: '右' }

const faceDir = (f: Face): Dir => cameraForFace(f, 1)
const add = (a: Dir, b: Dir): Dir => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z })
const norm = (d: Dir): Dir => {
  const l = Math.hypot(d.x, d.y, d.z)
  return { x: d.x / l, y: d.y / l, z: d.z / l }
}
const dot = (a: Dir, b: Dir): number => a.x * b.x + a.y * b.y + a.z * b.z
/** 見える（向いている）と見なす内積の下限。水平から見たときの計算の誤差（1e-17 程度）で、面や辺が見えないように */
const VISIBLE_EPS = 1e-6
const cross = (a: Dir, b: Dir): Dir => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x })

const FACE_TARGETS: CubeTarget[] = FACE_IDS.map((f) => ({ kind: 'face', id: f, dir: faceDir(f), label: FACE_LABEL[f] }))

// 辺は、隣り合う二面（上下・正面背面・左右のうち、どの軸も同じ組でないもの）。12 組
const EDGE_PAIRS: [Face, Face][] = [
  ['top', 'front'], ['top', 'back'], ['top', 'left'], ['top', 'right'],
  ['bottom', 'front'], ['bottom', 'back'], ['bottom', 'left'], ['bottom', 'right'],
  ['front', 'left'], ['front', 'right'], ['back', 'left'], ['back', 'right'],
]
const EDGE_TARGETS: CubeTarget[] = EDGE_PAIRS.map(([a, b]) => ({ kind: 'edge', id: `${a}-${b}`, dir: norm(add(faceDir(a), faceDir(b))) }))

// 隅は、上下のどちらか・正面背面のどちらか・左右のどちらか。8 組
const CORNER_TARGETS: CubeTarget[] = []
for (const v of ['top', 'bottom'] as const) {
  for (const h of ['front', 'back'] as const) {
    for (const s of ['left', 'right'] as const) {
      CORNER_TARGETS.push({ kind: 'corner', id: `${v}-${h}-${s}`, dir: norm(add(add(faceDir(v), faceDir(h)), faceDir(s))) })
    }
  }
}

/** 六面・十二辺・八隅の 26 の向き（面 → 辺 → 隅の順） */
export const CUBE_TARGETS: CubeTarget[] = [...FACE_TARGETS, ...EDGE_TARGETS, ...CORNER_TARGETS]

export interface CubeView {
  /** 面。visible は、カメラの向きに面が向いているか。points は画面上の四隅（px に直す前。単位立方体の一辺は ±1） */
  faces: { id: Face; label: string; visible: boolean; points: [number, number][]; center: [number, number] }[]
  /** 辺。visible は、辺の向きがカメラの向きと同じ側にあるか。from・to は画面上の両端 */
  edges: { id: string; visible: boolean; from: [number, number]; to: [number, number] }[]
  /** 隅。visible は、隅の向きがカメラの向きと同じ側にあるか。at は画面上の位置 */
  corners: { id: string; visible: boolean; at: [number, number] }[]
}

// 面の四隅（単位立方体の、その面の頂点）
function faceCornersOf(n: Dir): Dir[] {
  const axes = ['x', 'y', 'z'] as const
  const axis = axes.find((a) => n[a] !== 0)!
  const [p, q] = axes.filter((a) => a !== axis)
  const out: Dir[] = []
  for (const [u, w] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
    const v: Dir = { x: 0, y: 0, z: 0 }
    v[axis] = n[axis]
    v[p!] = u
    v[q!] = w
    out.push(v)
  }
  return out
}

/** カメラの向き（注視点からカメラへの向き）から、キューブの見え方を作る。画面の右は、世界の上（y）とカメラの向きの外積。真上からは、右を x 軸に決める */
export function cubeViewOf(toCamera: Dir): CubeView {
  const b = norm(toCamera)
  let right = cross({ x: 0, y: 1, z: 0 }, b)
  if (Math.hypot(right.x, right.y, right.z) < 1e-9) right = { x: 1, y: 0, z: 0 }
  right = norm(right)
  const up = cross(b, right)
  const project = (v: Dir): [number, number] => [dot(v, right), dot(v, up)]

  const faces = FACE_TARGETS.map((t) => ({
    id: t.id as Face,
    label: t.label!,
    visible: dot(t.dir, b) > VISIBLE_EPS,
    points: faceCornersOf(t.dir).map(project),
    center: project(t.dir),
  }))

  const edges = EDGE_TARGETS.map((t) => {
    // 辺の両端: 二つの軸は辺の向きの符号、残りの一つの軸は −1 と +1
    const axes = ['x', 'y', 'z'] as const
    const zeroAxis = axes.find((a) => Math.abs(t.dir[a]) < 1e-9)!
    const [p, q] = axes.filter((a) => a !== zeroAxis)
    const end = (c: number): Dir => {
      const v: Dir = { x: 0, y: 0, z: 0 }
      v[p!] = Math.sign(t.dir[p!])
      v[q!] = Math.sign(t.dir[q!])
      v[zeroAxis] = c
      return v
    }
    return { id: t.id, visible: dot(t.dir, b) > VISIBLE_EPS, from: project(end(-1)), to: project(end(1)) }
  })

  const corners = CORNER_TARGETS.map((t) => {
    const v: Dir = { x: Math.sign(t.dir.x), y: Math.sign(t.dir.y), z: Math.sign(t.dir.z) }
    return { id: t.id, visible: dot(t.dir, b) > VISIBLE_EPS, at: project(v) }
  })

  return { faces, edges, corners }
}
