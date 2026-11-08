// 仕様（統括の依頼 2026-11-06。P2 の斜線の基準を、P1 で選んだ筆に替える。1 件目: 筆の形を P2 の平面（mm）にする）:
// 仕様 1（面積）: 経緯度の矩形（20 m × 30 m）を平面にすると、面積は 600 m² に近い（誤差 0.5% 以内）。
// 仕様 2（向き）: 時計回りで書かれた外周も、反時計回りの平面にする。
// 仕様 3（原点）: 原点は筆の重心。矩形なら、頂点の平均は原点に近い（1 mm 以内）。
// 仕様 4（形）: 頂点の数は元のまま（L 字の 6 点は 6 点）。
// 仕様 5（複数の多角形）: MultiPolygon は、いちばん広い多角形を使う。
// 仕様 6（取れない）: 図形が無い・点の数が足りない・多角形でないときは null。
// 仕様 7（穴）: 穴のある多角形は外周だけを使う。
import { describe, expect, it } from 'vitest'
import { polygonAreaMm2 } from '../geom/polygon'
import { parcelRingOf } from './parcelPlane'

const R = 6_371_008.8
const DEG = Math.PI / 180
const LAT0 = 35.68
const LON0 = 139.86
// 経緯度で、中心から dx・dy（m）ずらした点
const at = (dx: number, dy: number): [number, number] => [LON0 + dx / (R * Math.cos(LAT0 * DEG) * DEG), LAT0 + dy / (R * DEG)]
const rectangle = (w: number, h: number): [number, number][] => [at(0, 0), at(w, 0), at(w, h), at(0, h), at(0, 0)]
const polygon = (ring: [number, number][]) => ({ type: 'Polygon', coordinates: [ring] })

describe('筆の形を平面（mm）にする（仕様 1〜7）', () => {
  it('仕様 1: 20 m × 30 m の矩形の面積は 600 m² に近い', () => {
    const ring = parcelRingOf(polygon(rectangle(20, 30)))
    expect(ring).not.toBeNull()
    expect(Math.abs(polygonAreaMm2(ring!) / 600_000_000 - 1)).toBeLessThan(0.005)
  })

  it('仕様 2: 時計回りの外周も、反時計回りになる（符号つき面積が正）', () => {
    const cw = [...rectangle(20, 30)].reverse()
    const ring = parcelRingOf(polygon(cw))!
    const signed = ring.reduce((s, p, i) => s + (p.x * ring[(i + 1) % ring.length]!.y - ring[(i + 1) % ring.length]!.x * p.y), 0)
    expect(signed).toBeGreaterThan(0)
  })

  it('仕様 3: 原点は筆の重心（矩形なら頂点の平均が原点に近い）', () => {
    const ring = parcelRingOf(polygon(rectangle(20, 30)))!
    const mx = ring.reduce((s, p) => s + p.x, 0) / ring.length
    const my = ring.reduce((s, p) => s + p.y, 0) / ring.length
    expect(Math.abs(mx)).toBeLessThan(1)
    expect(Math.abs(my)).toBeLessThan(1)
  })

  it('仕様 4: 頂点の数は元のまま（L 字は 6 点）', () => {
    const l = [at(0, 0), at(20, 0), at(20, 10), at(10, 10), at(10, 30), at(0, 30), at(0, 0)]
    expect(parcelRingOf(polygon(l))).toHaveLength(6)
  })

  it('仕様 5: MultiPolygon は、いちばん広い多角形を使う', () => {
    const small = rectangle(5, 5)
    const big = rectangle(20, 30)
    const ring = parcelRingOf({ type: 'MultiPolygon', coordinates: [[small], [big]] })!
    expect(Math.abs(polygonAreaMm2(ring) / 600_000_000 - 1)).toBeLessThan(0.005)
  })

  it('仕様 6: 図形が無い・点が足りない・多角形でないときは null', () => {
    expect(parcelRingOf(undefined)).toBeNull()
    expect(parcelRingOf(polygon([at(0, 0), at(1, 1)]))).toBeNull()
    expect(parcelRingOf({ type: 'Point', coordinates: [LON0, LAT0] })).toBeNull()
  })

  it('仕様 7: 穴のある多角形は、外周だけを使う', () => {
    const hole = [at(5, 5), at(10, 5), at(10, 10), at(5, 10), at(5, 5)]
    const ring = parcelRingOf({ type: 'Polygon', coordinates: [rectangle(20, 30), hole] })!
    expect(Math.abs(polygonAreaMm2(ring) / 600_000_000 - 1)).toBeLessThan(0.005)
  })
})
