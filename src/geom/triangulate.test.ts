// 仕様: 単純多角形（自己交差しない）を三角形に分ける。押し出しの底面・天面（D-02 C5）に使う。
// 仕様 1: 三角形の面積の和は多角形の面積に一致する（凹多角形でも）。
// 仕様 2: 頂点 n 個の単純多角形は n − 2 個の三角形になる。
// 仕様 3: 時計回りでも反時計回りでも同じ結果の面積になる。
// 仕様 4: 頂点が 3 つ未満なら弾く。
import { describe, expect, it } from 'vitest'
import { triangulatePolygon } from './triangulate'
import { polygonAreaMm2 } from './polygon'
import type { Point } from './viewport'

const rect: Point[] = [
  { x: 0, y: 0 },
  { x: 10_000, y: 0 },
  { x: 10_000, y: 20_000 },
  { x: 0, y: 20_000 },
]

// L 字（凹の頂点を 1 つ持つ）
const lShape: Point[] = [
  { x: 0, y: 0 },
  { x: 20_000, y: 0 },
  { x: 20_000, y: 10_000 },
  { x: 10_000, y: 10_000 },
  { x: 10_000, y: 20_000 },
  { x: 0, y: 20_000 },
]

function triangleAreaSum(tris: [Point, Point, Point][]): number {
  return tris.reduce((sum, t) => sum + polygonAreaMm2(t), 0)
}

describe('triangulatePolygon', () => {
  it('矩形は 2 個の三角形になり、面積の和は矩形の面積に一致する', () => {
    const tris = triangulatePolygon(rect)
    expect(tris).toHaveLength(2)
    expect(triangleAreaSum(tris)).toBe(polygonAreaMm2(rect))
  })

  it('凹多角形でも三角形の面積の和は多角形の面積に一致し、個数は n − 2 になる', () => {
    const tris = triangulatePolygon(lShape)
    expect(tris).toHaveLength(lShape.length - 2)
    expect(triangleAreaSum(tris)).toBe(polygonAreaMm2(lShape))
  })

  it('時計回りの入力でも面積の和は同じになる', () => {
    const cw = [...rect].reverse()
    expect(triangleAreaSum(triangulatePolygon(cw))).toBe(polygonAreaMm2(rect))
  })

  it('頂点が 3 つ未満なら弾く', () => {
    expect(() => triangulatePolygon([{ x: 0, y: 0 }, { x: 1_000, y: 0 }])).toThrow()
  })
})
