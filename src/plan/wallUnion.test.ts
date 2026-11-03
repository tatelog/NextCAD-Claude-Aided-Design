// 仕様（ハブ A-03 G4・D-02 C3「2D 図形の生成規則」）: 壁は中心線の両側に広げた四角形を、和の一つの輪郭にする。
// 壁と壁がぶつかるところ（十字・T 字・L 字・斜め）は、重なりを取り除き、境界を一つにつなぐ（トリミング）。
// 仕様 1: 一枚の四角形は、そのまま一つの輪郭（面積は元と同じ）。
// 仕様 2: 重なる二枚（十字・T 字）は、一つの輪郭。面積は各面積の和から重なりを引いたもの。
// 仕様 3: 離れた二枚は、二つの輪郭（面積は和）。
// 仕様 4: 辺を共有して並ぶ二枚（一直線に続く壁）は、共有の辺が消えて一つの輪郭（面積は和）。
// 仕様 5: 輪郭の辺の中点は、どの入力の四角形の内部にも入らない（重なりは残らない）。
// 仕様 6: 同じ入力には同じ出力で、入力を書き換えない。
// 仕様 7（壁の線から）: L 字の角は、角を埋めた二枚の和で、一つの輪郭。面積は重なりを引いた値。
import { describe, expect, it } from 'vitest'
import { wallUnionRings, wallOutlineRings } from './wallUnion'
import { wallRectOf } from './wallOutline'
import type { Point } from '../geom/viewport'

const rect = (x0: number, y0: number, x1: number, y1: number): Point[] => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
]

// 輪郭の符号つき面積の合計（外側は正、穴は負）。和の面積になる
function areaOf(rings: Point[][]): number {
  return rings.reduce((sum, ring) => {
    let s = 0
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i]!
      const q = ring[(i + 1) % ring.length]!
      s += p.x * q.y - q.x * p.y
    }
    return sum + s / 2
  }, 0)
}

// 内部（境界上は含めない）。境界上の点はレイキャストが不安定なので、先に境界を外す
function insideStrictly(p: Point, poly: Point[]): boolean {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!
    const b = poly[(i + 1) % poly.length]!
    const r = { x: b.x - a.x, y: b.y - a.y }
    const t = Math.min(1, Math.max(0, ((p.x - a.x) * r.x + (p.y - a.y) * r.y) / (r.x * r.x + r.y * r.y)))
    if (Math.hypot(p.x - (a.x + r.x * t), p.y - (a.y + r.y * t)) < 1e-6) return false
  }
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!
    const b = poly[j]!
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

describe('和の輪郭（仕様 1〜4）', () => {
  it('仕様 1: 一枚の四角形は、そのまま一つの輪郭（面積は元と同じ）', () => {
    const rings = wallUnionRings([rect(0, 0, 10, 5)])
    expect(rings).toHaveLength(1)
    expect(areaOf(rings)).toBeCloseTo(50, 6)
  })

  it('仕様 2: 十字に重なる二枚は、一つの輪郭。面積は和から重なりを引いたもの', () => {
    // 横: 0〜1000 × -100〜100（200000）。縦: 400〜600 × -500〜500（200000）。重なり 200 × 200（40000）
    const rings = wallUnionRings([rect(0, -100, 1000, 100), rect(400, -500, 600, 500)])
    expect(rings).toHaveLength(1)
    expect(areaOf(rings)).toBeCloseTo(360000, 3)
  })

  it('仕様 2: T 字に重なる二枚（縦の壁は横の壁の中心で止まる）は、一つの輪郭', () => {
    // 横: 0〜1000 × -100〜100（200000）。縦: 400〜600 × 0〜500（100000）。重なり 200 × 100（20000）
    const rings = wallUnionRings([rect(0, -100, 1000, 100), rect(400, 0, 600, 500)])
    expect(rings).toHaveLength(1)
    expect(areaOf(rings)).toBeCloseTo(280000, 3)
  })

  it('仕様 2: 斜めに交わる二枚は、一つの輪郭。面積は各面積の和より小さく、どちらか一方より大きい', () => {
    const a = wallRectOf({ x: 0, y: 0 }, { x: 1000, y: 1000 }, 200)
    const b = wallRectOf({ x: 0, y: 1000 }, { x: 1000, y: 0 }, 200)
    const rings = wallUnionRings([a, b])
    expect(rings).toHaveLength(1)
    const area = areaOf(rings)
    const single = 1000 * Math.SQRT2 * 200
    expect(area).toBeLessThan(2 * single)
    expect(area).toBeGreaterThan(single)
  })

  it('仕様 3: 離れた二枚は、二つの輪郭（面積は和）', () => {
    const rings = wallUnionRings([rect(0, 0, 10, 10), rect(100, 100, 120, 110)])
    expect(rings).toHaveLength(2)
    expect(areaOf(rings)).toBeCloseTo(100 + 200, 6)
  })

  it('仕様 4: 辺を共有して一直線に続く二枚は、共有の辺が消えて一つの輪郭（面積は和）', () => {
    const rings = wallUnionRings([rect(0, 0, 1000, 200), rect(1000, 0, 2000, 200)])
    expect(rings).toHaveLength(1)
    expect(areaOf(rings)).toBeCloseTo(400000, 3)
    expect(rings[0]).toHaveLength(4)
  })
})

describe('輪郭の中に重なりが残らない（仕様 5）', () => {
  it('十字の輪郭の辺の中点は、どの入力の内部にも入らない', () => {
    const inputs = [rect(0, -100, 1000, 100), rect(400, -500, 600, 500)]
    const rings = wallUnionRings(inputs)
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i++) {
        const p = ring[i]!
        const q = ring[(i + 1) % ring.length]!
        const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
        for (const poly of inputs) expect(insideStrictly(m, poly)).toBe(false)
      }
    }
  })
})

describe('同じ入力（仕様 6）', () => {
  it('同じ入力には同じ出力で、入力を書き換えない', () => {
    const inputs = [rect(0, -100, 1000, 100), rect(400, 0, 600, 500)]
    const before = JSON.stringify(inputs)
    expect(wallUnionRings(inputs)).toEqual(wallUnionRings(inputs))
    expect(JSON.stringify(inputs)).toBe(before)
  })
})

describe('壁の線からの輪郭（仕様 7）', () => {
  it('L 字の角は、角を埋めた二枚の和で一つの輪郭。面積は 400000', () => {
    const L = [
      { id: 'h', a: { x: 0, y: 0 }, b: { x: 1000, y: 0 }, kind: 'wall' as const },
      { id: 'v', a: { x: 1000, y: 0 }, b: { x: 1000, y: 1000 }, kind: 'wall' as const },
    ]
    const rings = wallOutlineRings(L, 200)
    expect(rings).toHaveLength(1)
    expect(areaOf(rings)).toBeCloseTo(400000, 3)
    // 外側の角（1100, -100）を含む
    expect(rings[0]!.some((p) => Math.round(p.x) === 1100 && Math.round(p.y) === -100)).toBe(true)
  })

  it('T 字（横の壁の中心に、縦の壁の端が当たる）は、一つの輪郭。面積は 280000', () => {
    const T = [
      { id: 'h', a: { x: 0, y: 0 }, b: { x: 1000, y: 0 }, kind: 'wall' as const },
      { id: 'v', a: { x: 500, y: 0 }, b: { x: 500, y: 500 }, kind: 'wall' as const },
    ]
    const rings = wallOutlineRings(T, 200)
    expect(rings).toHaveLength(1)
    expect(areaOf(rings)).toBeCloseTo(280000, 3)
  })
})
