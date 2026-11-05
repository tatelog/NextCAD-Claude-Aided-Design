// 仕様（統括の依頼 2026-11-06。1: 確定の地点は、筆の中の点（L 字でも外に出ない点））:
// 仕様 1c: 矩形の筆では、筆の中の点を返す（筆の中）。
// 仕様 1d: 重心が筆の外に出る L 字の筆でも、筆の中で、辺から離れた点を返す。
// 仕様 1e: 筆の図形が取れないときは null。
import { describe, expect, it } from 'vitest'
import { interiorPointOf } from './interiorPoint'

const ring = (pts: [number, number][]) => ({ type: 'Polygon', coordinates: [[...pts, pts[0]]] })

// 点が多角形の中か（テスト用の独立の判定）
function inside(p: [number, number], poly: [number, number][]): boolean {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!
    const [xj, yj] = poly[j]!
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

const RECT: [number, number][] = [
  [139.83, 35.67],
  [139.831, 35.67],
  [139.831, 35.671],
  [139.83, 35.671],
]
const L_SHAPE: [number, number][] = [
  [139.83, 35.67],
  [139.832, 35.67],
  [139.832, 35.6705],
  [139.8305, 35.6705],
  [139.8305, 35.6715],
  [139.83, 35.6715],
]

describe('筆の中の点（仕様 1c〜1e）', () => {
  it('仕様 1c: 矩形の筆では、筆の中の点を返す', () => {
    const p = interiorPointOf(ring(RECT))
    expect(p).not.toBeNull()
    expect(inside([p!.lon, p!.lat], RECT)).toBe(true)
  })

  it('仕様 1d: 重心が外に出る L 字でも、筆の中で、辺から離れた点を返す', () => {
    const p = interiorPointOf(ring(L_SHAPE))
    expect(p).not.toBeNull()
    expect(inside([p!.lon, p!.lat], L_SHAPE)).toBe(true)
  })

  it('仕様 1e: 筆の図形が取れないときは null', () => {
    expect(interiorPointOf(undefined)).toBeNull()
  })
})
