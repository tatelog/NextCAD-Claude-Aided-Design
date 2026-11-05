// 仕様（統括の依頼 2026-11-06。4: P2 の 3D に、外形を描く前から、確定した敷地（筆）と周辺建物を出す）:
// 仕様 4a: 外形が閉じていなくても、確定した敷地があれば 3D を出す（敷地を先に見せる）。
// 仕様 4b: 外形が閉じていなくても、周辺建物があれば 3D を出す。
// 仕様 4c: 外形・敷地・周辺建物が何も無ければ、3D は出さない（案内を出す）。
// 仕様 4d: 敷地の面は、外形と同じ平面（x・y）の座標で、敷地の頂点の上に載る（地面より少し上）。
import { describe, expect, it } from 'vitest'
import type { Point } from '../geom/viewport'
import { lotPlateTrianglesOf, LOT_LIFT_MM, shouldShowScene3DOf } from './volumeScene'

const SQUARE: Point[] = [
  { x: 0, y: 0 },
  { x: 10_000, y: 0 },
  { x: 10_000, y: 10_000 },
  { x: 0, y: 10_000 },
]

describe('外形の前から出す 3D（仕様 4a〜4c）', () => {
  it('仕様 4a: 外形が閉じていなくても、確定した敷地があれば出す', () => {
    expect(shouldShowScene3DOf({ hasVolume: false, hasLot: true, neighborCount: 0 })).toBe(true)
  })

  it('仕様 4b: 外形が閉じていなくても、周辺建物があれば出す', () => {
    expect(shouldShowScene3DOf({ hasVolume: false, hasLot: false, neighborCount: 3 })).toBe(true)
  })

  it('仕様 4c: 外形・敷地・周辺建物が何も無ければ出さない', () => {
    expect(shouldShowScene3DOf({ hasVolume: false, hasLot: false, neighborCount: 0 })).toBe(false)
  })
})

describe('敷地の面（仕様 4d）', () => {
  it('仕様 4d: 敷地の面は、敷地の頂点の平面の座標に載り、地面より少し上にある', () => {
    const triangles = lotPlateTrianglesOf(SQUARE)
    expect(triangles.length).toBe(2)
    for (const tri of triangles) {
      for (const v of tri) {
        expect(v.z).toBe(LOT_LIFT_MM)
        expect(SQUARE.some((p) => p.x === v.x && p.y === v.y)).toBe(true)
      }
    }
    expect(LOT_LIFT_MM).toBeGreaterThan(0)
  })
})
