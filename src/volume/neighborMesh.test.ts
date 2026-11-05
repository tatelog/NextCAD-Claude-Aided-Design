// 仕様（統括の依頼 2026-11-06（急ぎ）。白い画面の直し: 周辺建物の 3D は、整数の検査を通さずに作る）:
// 仕様 1a: 小数の座標・小数の高さの周辺建物を渡しても、例外にならず三角形を出す。
// 仕様 1b: 小数の周辺建物の立体は、底面の頂点と同じ平面の座標を持つ（ずれない）。
// 仕様 2a: 壊れた一棟（点が 2 つ・面積 0・高さが数でない・座標が数でない）は、その一棟だけ飛ばし、ほかは描く。
import { describe, expect, it } from 'vitest'
import type { Point } from '../geom/viewport'
import { neighborMeshesOf, neighborMeshOf } from './neighborMesh'

const SMALL: Point[] = [
  { x: 100.5, y: 0 },
  { x: 5000.25, y: 0 },
  { x: 5000, y: 3000.75 },
]

describe('周辺建物の立体（仕様 1a・1b）', () => {
  it('仕様 1a: 小数の座標・小数の高さを渡しても、例外にならず三角形を出す', () => {
    const mesh = neighborMeshOf(SMALL, 12345.678)
    expect(mesh).not.toBeNull()
    expect(mesh!.triangles.length).toBeGreaterThan(0)
  })

  it('仕様 1b: 立体の頂点は、底面の頂点と同じ平面の座標（x・y）を持つ', () => {
    const mesh = neighborMeshOf(SMALL, 9000.5)!
    const xy = new Set(SMALL.map((p) => `${p.x},${p.y}`))
    for (const tri of mesh.triangles) for (const v of tri) expect(xy.has(`${v.x},${v.y}`)).toBe(true)
  })
})

describe('壊れた一棟は飛ばす（仕様 2a）', () => {
  it('点が 2 つ・面積 0・高さが数でない・座標が数でない一棟は、その一棟だけ飛ばし、ほかは描く', () => {
    const broken: [Point[], number][] = [
      [[{ x: 0, y: 0 }, { x: 1000, y: 0 }], 9000],
      [[{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 2000, y: 0 }], 9000],
      [SMALL, Number.NaN],
      [[{ x: Number.NaN, y: 0 }, { x: 1000, y: 0 }, { x: 0, y: 1000 }], 9000],
    ]
    for (const [fp, h] of broken) expect(neighborMeshOf(fp, h)).toBeNull()
    const meshes = neighborMeshesOf([
      { footprint: broken[0]![0], heightMm: 9000 },
      { footprint: SMALL, heightMm: 9000.5 },
      { footprint: broken[2]![0], heightMm: Number.NaN },
    ])
    expect(meshes.length).toBe(1)
    expect(meshes[0]!.triangles.length).toBeGreaterThan(0)
  })
})
