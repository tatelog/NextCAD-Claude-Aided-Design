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
      const dz = -p.y / 1000 - frame.target[2] // 北は −z（統括の判断 2026-11-06）
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
    expect(frame.target[2]).toBeCloseTo(-20, 6) // 平面の y の中心 20 m は、three の z で −20 m（北は −z）
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
      const d = Math.hypot(p.x / 1000 - cx, 0 - cy, -p.y / 1000 - cz)
      expect(d).toBeGreaterThanOrEqual(planes.near)
      expect(d).toBeLessThanOrEqual(planes.far)
    }
    expect(planes.far).toBeGreaterThan(1000)
  })
})

// 仕様（統括の依頼 2026-11-06（最優先の不具合）。3D の拡大で、範囲が消える。近い平面は、カメラを寄せた今の距離で決める）:
// 仕様 2b: 目標から半径 r 以内の範囲の点は、カメラが今どの距離 d にあっても、近い平面以上・遠い平面以下に入る。
//          （最も近い点の距離は max(d − r, 0.01)、最も遠い点の距離は d + r）
// 仕様 2c: 近い平面は 0.01 m 以上。遠い平面は範囲の最も遠い点より遠い。
// 仕様 2d: 寄せていく途中（ホイールの一段ごとに距離が縮む）でも、どの段でも 2b が成り立つ。
import { clipPlanesAt } from './volumeScene'

describe('カメラの今の距離に合わせる平面（仕様 2b〜2d）', () => {
  const R = 150 // 範囲の半径（m）

  it('仕様 2b: どの距離でも、範囲の最も近い点・最も遠い点は、近い平面と遠い平面の間に入る', () => {
    for (const d of [0, 0.5, 5, 50, 100, 150, 200, 400, 504, 1000, 3000, 10_000]) {
      const planes = clipPlanesAt(d, R)
      expect(planes.near).toBeLessThanOrEqual(Math.max(d - R, 0.01))
      expect(planes.far).toBeGreaterThanOrEqual(d + R)
    }
  })

  it('仕様 2c: 近い平面は 0.01 m 以上、遠い平面は近い平面より遠い', () => {
    for (const d of [0, 1, 100, 10_000]) {
      const planes = clipPlanesAt(d, R)
      expect(planes.near).toBeGreaterThanOrEqual(0.01)
      expect(planes.far).toBeGreaterThan(planes.near)
    }
  })

  it('仕様 2d: 初期の距離から一段ずつ寄せていく（0.95 倍ずつ縮む）途中のどの段でも、2b が成り立つ', () => {
    let d = 3.36 * R
    for (let step = 0; step < 60; step++) {
      const planes = clipPlanesAt(d, R)
      expect(planes.near).toBeLessThanOrEqual(Math.max(d - R, 0.01))
      expect(planes.far).toBeGreaterThanOrEqual(d + R)
      d *= 0.95
    }
  })
})

// 仕様（代表の依頼 2026-11-06。2: 初期表示は、確定した敷地を、南から北を向く正面（上から見下ろす 45°）で出す。外形が閉じていても）:
// 仕様 3a: 初期の視点の範囲は敷地だけで決まる（周辺建物は入らない。外形の閉じ具合にも関係しない）。
// 仕様 3b: 初期の視点は南側にあり、北を向く（カメラは目標より南（z が大きい側。南は +z）で、目標より上）。
// 仕様 3c: 初期の視点は、敷地の範囲の球が縦の視野に入る距離にある。
// 仕様 3d: 敷地が無ければ、初期の視点は無い（null）。
import { initialViewOf } from './volumeScene'

describe('初期の視点（仕様 3a〜3d）', () => {
  const FOV = 40
  const LOT: Point[] = [
    { x: 0, y: 0 },
    { x: 10_000, y: 0 },
    { x: 10_000, y: 10_000 },
    { x: 0, y: 10_000 },
  ]

  it('仕様 3a: 範囲は敷地の頂点だけで決まる（中心 (5, 5) m、半径は対角の半分）', () => {
    const frame = initialViewOf(LOT, FOV)!
    expect(frame.target[0]).toBeCloseTo(5, 6)
    expect(frame.target[2]).toBeCloseTo(-5, 6)
    expect(frame.radiusM).toBeCloseTo(Math.hypot(5, 5), 6)
  })

  it('仕様 3b: カメラは目標より南（z が小さい側）にあり、目標より上から北を向く', () => {
    const frame = initialViewOf(LOT, FOV)!
    const [px, py, pz] = frame.position
    const [, ty, tz] = frame.target
    expect(pz).toBeGreaterThan(tz) // 南は +z（統括の判断 2026-11-06）
    expect(py).toBeGreaterThan(ty)
    expect(Math.abs(px - frame.target[0])).toBeLessThan(1e-9)
  })

  it('仕様 3c: 球が縦の視野に入る距離にあり、カメラと目標の距離は distanceM', () => {
    const frame = initialViewOf(LOT, FOV)!
    expect(frame.distanceM * Math.sin((FOV / 2) * (Math.PI / 180))).toBeGreaterThanOrEqual(frame.radiusM)
    const [px, py, pz] = frame.position
    const [tx, ty, tz] = frame.target
    expect(Math.hypot(px - tx, py - ty, pz - tz)).toBeCloseTo(frame.distanceM, 6)
  })

  it('仕様 3d: 敷地が無ければ、初期の視点は無い', () => {
    expect(initialViewOf(null, FOV)).toBeNull()
    expect(initialViewOf([], FOV)).toBeNull()
  })
})
