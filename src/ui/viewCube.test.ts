// 仕様（代表の依頼 2026-11-06。3: 右上の 上・下・正面・背面・左・右 を、3D のキューブに替える。キューブはカメラと一緒に回る）:
// 仕様 C1: 六面・十二辺・八隅の、26 の向きがある。どれも単位長さで、互いに違う。
// 仕様 C2: 六面の向き。上は +y、下は −y、正面は南（+z）から北を見る向き、背面は北（−z）、右は +x、左は −x（北は −z。統括の判断 2026-11-06）。見出しは 上・下・正面・背面・左・右。
// 仕様 C3: 辺は隣り合う二面の向きの和、隅は三面の向きの和（どちらも単位長さに直す）。
// 仕様 C4: カメラの向きに対して、そちらを向いている面・辺・隅だけを見える（押せる）とする。
//          正面から見るときは正面だけ、上から見るときは上だけ、角から見るときは三面・三辺・四隅（向きの内積が正）。
import { describe, expect, it } from 'vitest'
import { CUBE_TARGETS, cubeViewOf } from './viewCube'

const len = (d: { x: number; y: number; z: number }) => Math.hypot(d.x, d.y, d.z)
const key = (d: { x: number; y: number; z: number }) => [d.x, d.y, d.z].map((v) => v.toFixed(6)).join(',')

describe('ビューキューブの向き（仕様 C1〜C3）', () => {
  it('仕様 C1: 六面・十二辺・八隅の 26 の向き。どれも単位長さで、互いに違う', () => {
    expect(CUBE_TARGETS.filter((t) => t.kind === 'face')).toHaveLength(6)
    expect(CUBE_TARGETS.filter((t) => t.kind === 'edge')).toHaveLength(12)
    expect(CUBE_TARGETS.filter((t) => t.kind === 'corner')).toHaveLength(8)
    for (const t of CUBE_TARGETS) expect(len(t.dir)).toBeCloseTo(1, 9)
    expect(new Set(CUBE_TARGETS.map((t) => key(t.dir))).size).toBe(26)
  })

  it('仕様 C2: 六面の向きと見出し。正面は南（−z）から北を見る向き、背面は北（+z）', () => {
    const face = (id: string) => CUBE_TARGETS.find((t) => t.kind === 'face' && t.id === id)!
    expect(face('top').dir).toEqual({ x: 0, y: 1, z: 0 })
    expect(face('bottom').dir).toEqual({ x: 0, y: -1, z: 0 })
    expect(face('front').dir).toEqual({ x: 0, y: 0, z: 1 })
    expect(face('back').dir).toEqual({ x: 0, y: 0, z: -1 })
    expect(face('right').dir).toEqual({ x: 1, y: 0, z: 0 })
    expect(face('left').dir).toEqual({ x: -1, y: 0, z: 0 })
    expect(['top', 'bottom', 'front', 'back', 'left', 'right'].map((id) => face(id).label)).toEqual(['上', '下', '正面', '背面', '左', '右'])
  })

  it('仕様 C3: 辺は二つの軸成分が ±1/√2、隅は三つの軸成分が ±1/√3（隣り合う面の向きの和を単位長さに直したもの）', () => {
    const s2 = 1 / Math.SQRT2
    const s3 = 1 / Math.sqrt(3)
    for (const t of CUBE_TARGETS.filter((t) => t.kind === 'edge')) {
      const comps = [t.dir.x, t.dir.y, t.dir.z]
      expect(comps.filter((v) => v !== 0)).toHaveLength(2)
      for (const v of comps.filter((v) => v !== 0)) expect(Math.abs(v)).toBeCloseTo(s2, 9)
    }
    for (const t of CUBE_TARGETS.filter((t) => t.kind === 'corner')) {
      const comps = [t.dir.x, t.dir.y, t.dir.z]
      expect(comps.filter((v) => v !== 0)).toHaveLength(3)
      for (const v of comps) expect(Math.abs(v)).toBeCloseTo(s3, 9)
    }
  })
})

describe('カメラに向いている面・辺・隅（仕様 C4）', () => {
  it('仕様 C4: 正面から見ると、見える面は正面だけで、正面の四隅は単位立方体の一辺（±1）', () => {
    const v = cubeViewOf({ x: 0, y: 0, z: 1 })
    expect(v.faces.filter((f) => f.visible).map((f) => f.id)).toEqual(['front'])
    const front = v.faces.find((f) => f.id === 'front')!
    expect(front.points).toHaveLength(4)
    for (const [x, y] of front.points) {
      expect(Math.abs(x)).toBeCloseTo(1, 9)
      expect(Math.abs(y)).toBeCloseTo(1, 9)
    }
  })

  it('仕様 C4: 上から見ると、見える面は上だけ', () => {
    const v = cubeViewOf({ x: 0, y: 1, z: 0 })
    expect(v.faces.filter((f) => f.visible).map((f) => f.id)).toEqual(['top'])
  })

  it('仕様 C4: 角（右・上・正面寄り）から見ると、見える面は三つ、見える辺は三つ、見える隅は四つ', () => {
    const b = { x: 1, y: 1, z: 1 }
    const v = cubeViewOf(b)
    expect(v.faces.filter((f) => f.visible).map((f) => f.id).sort()).toEqual(['front', 'right', 'top'])
    expect(v.edges.filter((e) => e.visible)).toHaveLength(3)
    expect(v.corners.filter((c) => c.visible)).toHaveLength(4)
  })
})

describe('水平から見るとき（仕様 C4 の補足）', () => {
  it('仕様 C4: 正面から水平に見るとき、計算の誤差（1e-12 程度の上下・左右のずれ）で、上や右の面を見えるとしない', () => {
    const v = cubeViewOf({ x: 1e-12, y: 1e-12, z: 1 })
    expect(v.faces.filter((f) => f.visible).map((f) => f.id)).toEqual(['front'])
    // 見える辺は、見える正面の四辺だけ（上と正面・下と正面・正面と左・正面と右）
    expect(v.edges.filter((e) => e.visible).map((e) => e.id).sort()).toEqual(['bottom-front', 'front-left', 'front-right', 'top-front'])
  })
})
