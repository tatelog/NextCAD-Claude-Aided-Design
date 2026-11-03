// 押し出しの立体メッシュ（D-02 C5）。3D 表示（D-04 P2 の主画面、G42）に渡す三角形の列。単位は mm。
// 入力の検証と高さ・面積は extrudeVolume と同じ（ここでは二重に持たない）。
import { triangulatePolygon } from '../geom/triangulate'
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
  const h = v.total_height
  const bottom = (p: { x: number; y: number }): Vertex3 => ({ x: p.x, y: p.y, z: 0 })
  const top = (p: { x: number; y: number }): Vertex3 => ({ x: p.x, y: p.y, z: h })

  const triangles: VolumeMesh['triangles'] = []
  for (const [a, b, c] of triangulatePolygon(v.footprint)) {
    triangles.push([bottom(a), bottom(c), bottom(b)])
    triangles.push([top(a), top(b), top(c)])
  }

  const n = v.footprint.length
  for (let i = 0; i < n; i++) {
    const a = v.footprint[i]!
    const b = v.footprint[(i + 1) % n]!
    triangles.push([bottom(a), bottom(b), top(b)])
    triangles.push([bottom(a), top(b), top(a)])
  }

  return { total_height: h, triangles }
}
