// 仕様（統括の依頼 2026-11-06。4: P2 の 3D に、外形を描く前から、確定した敷地（筆）と周辺建物を出す）:
// 仕様 4a: 外形が閉じていなくても、確定した敷地があれば 3D を出す（敷地を先に見せる）。
// 仕様 4b: 外形が閉じていなくても、周辺建物があれば 3D を出す。
// 仕様 4c: 外形・敷地・周辺建物が何も無ければ、3D は出さない（案内を出す）。
// 仕様 4d: 敷地の面は、外形と同じ平面（x・y）の座標で、敷地の頂点の上に載る（地面より少し上）。
import { describe, expect, it } from 'vitest'
import type { Point } from '../geom/viewport'
import { clipPlanesOf, lotPlateTrianglesOf, LOT_LIFT_MM, shouldShowScene3DOf } from './volumeScene'

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

// 仕様（統括の依頼 2026-11-06。B: 外形が無いとき、確定した敷地（と周辺建物）の範囲が画面に収まるように、カメラを置く）:
// 仕様 B1: 範囲の点は、枠の球（中心 target・半径 radiusM）に入り、カメラは球が縦の視野に入る距離に置く。
// 仕様 B2: 範囲が無ければ、枠は無い（null）。
// 仕様 B3: 目標は範囲の中心（平面の x・z）。
import { sceneFrameOf } from './volumeScene'

describe('範囲に合わせるカメラ（仕様 B1〜B3）', () => {
  const FOV = 40
  const BIG: Point[] = [
    { x: -40_000, y: -30_000 },
    { x: 60_000, y: -30_000 },
    { x: 60_000, y: 70_000 },
    { x: -40_000, y: 70_000 },
  ]

  it('仕様 B1: 範囲の点は球に入り、カメラは球が縦の視野に入る距離にある', () => {
    const frame = sceneFrameOf([BIG], FOV)!
    expect(frame).not.toBeNull()
    for (const p of BIG) {
      const dx = p.x / 1000 - frame.target[0]
      const dz = p.y / 1000 - frame.target[2]
      expect(Math.hypot(dx, dz)).toBeLessThanOrEqual(frame.radiusM + 1e-6)
    }
    expect(frame.distanceM * Math.sin((FOV / 2) * (Math.PI / 180))).toBeGreaterThanOrEqual(frame.radiusM)
    const [px, py, pz] = frame.position
    const [tx, ty, tz] = frame.target
    expect(Math.hypot(px - tx, py - ty, pz - tz)).toBeCloseTo(frame.distanceM, 6)
  })

  it('仕様 B2: 範囲が無ければ、枠は無い', () => {
    expect(sceneFrameOf([], FOV)).toBeNull()
  })

  it('仕様 B3: 目標は範囲の中心（x・z）', () => {
    const frame = sceneFrameOf([BIG], FOV)!
    expect(frame.target[0]).toBeCloseTo(10, 6)
    expect(frame.target[2]).toBeCloseTo(20, 6)
  })
})

// 仕様（統括の依頼 2026-11-06（急ぎ）。4: 敷地の板と枠にも、退化や数でない値で落ちる道を作らない）:
// 仕様 4a: 敷地の板は、点が 2 つの退化した敷地でも例外にせず、空を返す。
// 仕様 4b: 枠（sceneFrameOf）は、数でない座標の点を無視する（枠の値が有限のまま）。
describe('敷地の板と枠の退化（仕様 4a・4b）', () => {
  it('仕様 4a: 点が 2 つの敷地は、例外にせず板を作らない', () => {
    expect(lotPlateTrianglesOf([{ x: 0, y: 0 }, { x: 1000, y: 0 }])).toEqual([])
  })

  it('仕様 4b: 数でない座標の点を無視して、枠の値は有限のまま', () => {
    const square: Point[] = [
      { x: -40_000, y: -30_000 },
      { x: 60_000, y: -30_000 },
      { x: 60_000, y: 70_000 },
    ]
    const frame = sceneFrameOf([[...square, { x: Number.NaN, y: 0 }]], 40)!
    expect(Number.isFinite(frame.radiusM)).toBe(true)
    expect(frame.target.every((v) => Number.isFinite(v))).toBe(true)
    expect(frame.position.every((v) => Number.isFinite(v))).toBe(true)
  })
})

// 仕様（統括の依頼 2026-11-06（3D が空）。2: 外形が無いときの 3D は、範囲が見える。範囲の点はカメラの近い平面と遠い平面の間に入る）:
// 仕様 2a: 範囲の点は、カメラからの距離が近い平面以上・遠い平面以下（遠い平面で切れない）。
describe('外形が無いときのカメラの平面（仕様 2a）', () => {
  it('範囲の点は、近い平面と遠い平面の間に入る（周辺建物の範囲は、既定の遠い平面 1000 m を超えても切れない）', () => {
    const wide: Point[] = [
      { x: -400_000, y: -400_000 },
      { x: 400_000, y: -400_000 },
      { x: 400_000, y: 400_000 },
      { x: -400_000, y: 400_000 },
    ]
    const frame = sceneFrameOf([wide], 40)!
    const planes = clipPlanesOf(frame)
    const [cx, cy, cz] = frame.position
    for (const p of wide) {
      const d = Math.hypot(p.x / 1000 - cx, 0 - cy, p.y / 1000 - cz)
      expect(d).toBeGreaterThanOrEqual(planes.near)
      expect(d).toBeLessThanOrEqual(planes.far)
    }
    expect(planes.far).toBeGreaterThan(1000)
  })
})
