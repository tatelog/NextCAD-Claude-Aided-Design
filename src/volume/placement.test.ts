// 仕様: P2 ボリュームの配置（D-04 P2、A-03 G65・G67・G71）。
// 仕様 1（G67）: 敷地境界から建物までの離れを、北・東・南・西の 4 方向で mm にする。数値を入れると建物が動く。
//   敷地が軸に平行な矩形のときだけ定義する（矩形でないときの離れの定義は G67 で未決のため null）。
// 仕様 2（G71）: 回転は建物の回転角を変えるだけで、面積と辺の長さは変えない。回転の中心を指定できる。
// 仕様 3（G65）: つまみで頂点を動かすと外形の頂点が入れ替わる。動かした結果が単純多角形（自己交差しない）でなければ弾く。
import { describe, expect, it } from 'vitest'
import { moveVertex, rotateFootprint, setbackFromRectParcel } from './placement'
import { polygonAreaMm2 } from '../geom/polygon'

const parcelRect = [
  { x: 0, y: 0 },
  { x: 30_000, y: 0 },
  { x: 30_000, y: 20_000 },
  { x: 0, y: 20_000 },
]

describe('setbackFromRectParcel（離れ）', () => {
  it('建物の北・東・南・西の離れを mm で返す', () => {
    const building = [
      { x: 3_000, y: 4_000 },
      { x: 25_000, y: 4_000 },
      { x: 25_000, y: 17_000 },
      { x: 3_000, y: 17_000 },
    ]
    expect(setbackFromRectParcel(parcelRect, building)).toEqual({ north: 3_000, east: 5_000, south: 4_000, west: 3_000 })
  })

  it('建物が敷地からはみ出すと、その方向の離れは負になる', () => {
    const building = [
      { x: -1_000, y: 4_000 },
      { x: 25_000, y: 4_000 },
      { x: 25_000, y: 17_000 },
      { x: -1_000, y: 17_000 },
    ]
    expect(setbackFromRectParcel(parcelRect, building)?.west).toBe(-1_000)
  })

  it('敷地が矩形でなければ離れは定義せず null を返す（G67 で未決）', () => {
    const lshape = [
      { x: 0, y: 0 },
      { x: 30_000, y: 0 },
      { x: 30_000, y: 10_000 },
      { x: 15_000, y: 10_000 },
      { x: 15_000, y: 20_000 },
      { x: 0, y: 20_000 },
    ]
    expect(setbackFromRectParcel(lshape, parcelRect)).toBeNull()
  })
})

describe('rotateFootprint（回転）', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10_000, y: 0 },
    { x: 10_000, y: 10_000 },
    { x: 0, y: 10_000 },
  ]

  it('中心まわりに 90° 回すと座標が写る。面積は変わらない', () => {
    const r = rotateFootprint(square, { x: 0, y: 0 }, 90)
    expect(r[1]!.x).toBeCloseTo(0)
    expect(r[1]!.y).toBeCloseTo(10_000)
    expect(polygonAreaMm2(r)).toBeCloseTo(polygonAreaMm2(square))
  })

  it('任意の角度（自由）でも辺の長さは変わらない', () => {
    const r = rotateFootprint(square, { x: 5_000, y: 5_000 }, 37)
    const len = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.hypot(q.x - p.x, q.y - p.y)
    expect(len(r[0]!, r[1]!)).toBeCloseTo(10_000)
  })
})

describe('moveVertex（つまみ）', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10_000, y: 0 },
    { x: 10_000, y: 10_000 },
    { x: 0, y: 10_000 },
  ]

  it('頂点を指定の位置へ動かし、他の頂点は変えない', () => {
    const r = moveVertex(square, 2, { x: 12_000, y: 12_000 })
    expect(r[2]).toEqual({ x: 12_000, y: 12_000 })
    expect(r[0]).toEqual(square[0])
  })

  it('動かした結果が自己交差すれば弾く', () => {
    // 頂点 1 を頂点 3 の向こうへ動かすと、辺が交差する
    expect(() => moveVertex(square, 1, { x: 0, y: 12_000 })).toThrow()
  })
})
