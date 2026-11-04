// 仕様: 押し出し（D-02 C5）の立体メッシュ。3D 表示（D-04 P2 の主画面、G42）に渡す。
// 仕様 1: 底面（z = 0）と天面（z = 高さ）の三角形の面積の和は、外形の面積に一致する。
// 仕様 2: 側面は外形の辺ごとに 2 個の三角形。その頂点の z は 0 と高さだけ。
// 仕様 3: 高さ = 階数 × 階高（extrudeVolume と同じ）。
// 仕様 4: 不正な入力（階数 0、階高 0、頂点 3 未満）は弾く（extrudeVolume と同じ）。
// 仕様 5: 凹の外形でも、天面と底面の面積が一致する。
import { describe, expect, it } from 'vitest'
import { buildVolumeMesh } from './mesh'
import { polygonAreaMm2 } from '../geom/polygon'
import type { Point } from '../geom/viewport'

type V3 = { x: number; y: number; z: number }

const rect: Point[] = [
  { x: 0, y: 0 },
  { x: 10_000, y: 0 },
  { x: 10_000, y: 20_000 },
  { x: 0, y: 20_000 },
]

const lShape: Point[] = [
  { x: 0, y: 0 },
  { x: 20_000, y: 0 },
  { x: 20_000, y: 10_000 },
  { x: 10_000, y: 10_000 },
  { x: 10_000, y: 20_000 },
  { x: 0, y: 20_000 },
]

function triArea(a: V3, b: V3, c: V3): number {
  return (
    Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2
  )
}

function capArea(tris: [V3, V3, V3][], z: number): number {
  return tris
    .filter((t) => t.every((v) => v.z === z))
    .reduce((sum, [a, b, c]) => sum + triArea(a, b, c), 0)
}

describe('buildVolumeMesh', () => {
  it('高さ = 階数 × 階高になり、天面と底面の面積は外形の面積に一致する', () => {
    const m = buildVolumeMesh({ footprint: rect, storey_count: 5, storey_height: 3_000 })
    expect(m.total_height).toBe(15_000)
    expect(capArea(m.triangles, 0)).toBe(polygonAreaMm2(rect))
    expect(capArea(m.triangles, 15_000)).toBe(polygonAreaMm2(rect))
  })

  it('側面は外形の辺ごとに 2 個の三角形になり、その z は 0 と高さだけ', () => {
    const m = buildVolumeMesh({ footprint: rect, storey_count: 2, storey_height: 3_000 })
    const side = m.triangles.filter((t) => !t.every((v) => v.z === 0) && !t.every((v) => v.z === 6_000))
    expect(side).toHaveLength(rect.length * 2)
    for (const t of side) {
      for (const v of t) expect([0, 6_000]).toContain(v.z)
    }
  })

  it('凹の外形でも天面と底面の面積は外形の面積に一致する', () => {
    const m = buildVolumeMesh({ footprint: lShape, storey_count: 3, storey_height: 3_000 })
    expect(capArea(m.triangles, 0)).toBe(polygonAreaMm2(lShape))
    expect(capArea(m.triangles, 9_000)).toBe(polygonAreaMm2(lShape))
  })

  it('不正な入力は弾く', () => {
    expect(() => buildVolumeMesh({ footprint: rect, storey_count: 0, storey_height: 3_000 })).toThrow()
    expect(() => buildVolumeMesh({ footprint: rect, storey_count: 3, storey_height: 0 })).toThrow()
    expect(() =>
      buildVolumeMesh({ footprint: [{ x: 0, y: 0 }, { x: 1_000, y: 0 }], storey_count: 1, storey_height: 3_000 }),
    ).toThrow()
  })
})
