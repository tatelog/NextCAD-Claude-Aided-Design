// 外形のつまみ（ハブ A-03 G65）の仕様テスト。仕様だけから書く。
//
// 仕様（代表の決定）: 「オブジェクトにはつまみを付けて、外形の変更を容易にする」
// 画面案（D-04 P2）: 選んだオブジェクトの角（四角）と辺の中点（丸）につまみを置く。
//                   つまんで動かすと外形が変わる。
//
// 今回の仮置き（これを 1 項目ずつテストにしている）:
//  1. 対象は P2 の外形。角（四角）と辺の中点（丸）の両方に出す
//  2. 角を動かすと、その頂点だけが動く
//  3. 辺の中点を動かすと、その辺の両端が同じだけ動く
//  4. 動かした先は、入力スナップのグリッドに吸着させる（段は呼び出し側が渡す）
//  5. 動かした結果が単純多角形（自己交差しない）でなければ、動かす前の形に戻す
//  6. つまみの当たり判定は 12 px（画面）
//  座標は整数 mm のままにする。
import { describe, expect, it } from 'vitest'
import {
  HANDLE_HIT_RADIUS_PX,
  dragHandle,
  footprintHandles,
  hitTestHandle,
  type FootprintHandle,
} from './footprintHandles'

type Pt = { x: number; y: number }

// 4000 x 3000 mm の長方形（左下から反時計回り）
const rect = (): Pt[] => [
  { x: 0, y: 0 },
  { x: 4000, y: 0 },
  { x: 4000, y: 3000 },
  { x: 0, y: 3000 },
]

// 凹んだ外形の例（L 字）
const lShape = (): Pt[] => [
  { x: 0, y: 0 },
  { x: 6000, y: 0 },
  { x: 6000, y: 2000 },
  { x: 2000, y: 2000 },
  { x: 2000, y: 6000 },
  { x: 0, y: 6000 },
]

// 辺 0 の中点が 2000.5 mm になる三角形（中点が半端な例）
const oddTriangle = (): Pt[] => [
  { x: 0, y: 0 },
  { x: 4001, y: 0 },
  { x: 0, y: 3000 },
]

// 並び順に依存しないよう、種類で絞って番号順に並べる
const byKind = (hs: FootprintHandle[], kind: 'corner' | 'midpoint'): FootprintHandle[] =>
  hs.filter((h) => h.kind === kind).sort((a, b) => a.index - b.index)

describe('外形のつまみ: 位置が外形から出る（角は四角、辺の中点は丸）', () => {
  it('四角形の外形から、角のつまみ 4 つと辺の中点のつまみ 4 つが出る', () => {
    const hs = footprintHandles(rect())
    expect(byKind(hs, 'corner')).toHaveLength(4)
    expect(byKind(hs, 'midpoint')).toHaveLength(4)
    expect(hs).toHaveLength(8)
  })

  it('角のつまみは四角で、位置は各頂点', () => {
    const corners = byKind(footprintHandles(rect()), 'corner')
    expect(corners.map((h) => [h.index, h.shape, h.x, h.y])).toEqual([
      [0, 'square', 0, 0],
      [1, 'square', 4000, 0],
      [2, 'square', 4000, 3000],
      [3, 'square', 0, 3000],
    ])
  })

  it('辺の中点のつまみは丸で、位置は各辺（頂点 i と次の頂点。最後の辺は先頭へ戻る）の中点', () => {
    const mids = byKind(footprintHandles(rect()), 'midpoint')
    expect(mids.map((h) => [h.index, h.shape, h.x, h.y])).toEqual([
      [0, 'circle', 2000, 0],
      [1, 'circle', 4000, 1500],
      [2, 'circle', 2000, 3000],
      [3, 'circle', 0, 1500],
    ])
  })

  it('頂点が n 個ならつまみは 2n 個（三角形は 6、L 字は 12）', () => {
    expect(footprintHandles(oddTriangle())).toHaveLength(6)
    expect(footprintHandles(lShape())).toHaveLength(12)
  })

  it('辺の中点が半端な位置（0.5 mm）になる辺でも、つまみは正確な中点に出る', () => {
    const m0 = byKind(footprintHandles(oddTriangle()), 'midpoint')[0]
    expect(m0).toMatchObject({ index: 0, x: 2000.5, y: 0 })
  })

  it('頂点が 3 つ未満（外形になっていない）ときは、つまみを出さない', () => {
    expect(footprintHandles([])).toEqual([])
    expect(footprintHandles([{ x: 0, y: 0 }])).toEqual([])
    expect(
      footprintHandles([
        { x: 0, y: 0 },
        { x: 1000, y: 0 },
      ]),
    ).toEqual([])
  })
})

describe('外形のつまみ: 角を動かすと、その頂点だけが動く', () => {
  // 各角を (+300, +200) 動かした先（どれも単純多角形のまま）
  const targets: Pt[] = [
    { x: 300, y: 200 },
    { x: 4300, y: 200 },
    { x: 4300, y: 3200 },
    { x: 300, y: 3200 },
  ]

  it.each([0, 1, 2, 3])('角 %i を動かすと、頂点 %i だけが変わり、頂点の数もほかの頂点も変わらない', (i) => {
    const target = targets[i]!
    const expected = rect()
    expected[i] = target
    const r = dragHandle(rect(), { kind: 'corner', index: i }, target, 100)
    expect(r.valid).toBe(true)
    expect(r.footprint).toEqual(expected)
  })

  it('入力の外形は書き換えない（動かした結果は別の配列で返る）', () => {
    const fp = rect()
    dragHandle(fp, { kind: 'corner', index: 2 }, { x: 5000, y: 4000 }, 100)
    dragHandle(fp, { kind: 'midpoint', index: 0 }, { x: 2000, y: 500 }, 100)
    dragHandle(fp, { kind: 'corner', index: 1 }, { x: 4000, y: 6000 }, 100) // 自己交差で弾かれる動かし方
    expect(fp).toEqual(rect())
  })
})

describe('外形のつまみ: 辺の中点を動かすと、その辺の両端が同じだけ動く', () => {
  it('辺 1（頂点 1 と 2）の中点を右へ 500 動かすと、頂点 1 と 2 が右へ 500 動き、ほかは動かない', () => {
    const r = dragHandle(rect(), { kind: 'midpoint', index: 1 }, { x: 4500, y: 1500 }, 100)
    expect(r.valid).toBe(true)
    expect(r.footprint).toEqual([
      { x: 0, y: 0 },
      { x: 4500, y: 0 },
      { x: 4500, y: 3000 },
      { x: 0, y: 3000 },
    ])
  })

  it('最後の辺（頂点 3 と先頭の頂点 0）の中点を動かすと、頂点 3 と 0 が同じだけ動く', () => {
    const r = dragHandle(rect(), { kind: 'midpoint', index: 3 }, { x: -600, y: 1500 }, 100)
    expect(r.valid).toBe(true)
    expect(r.footprint).toEqual([
      { x: -600, y: 0 },
      { x: 4000, y: 0 },
      { x: 4000, y: 3000 },
      { x: -600, y: 3000 },
    ])
  })

  it('斜めに動かしても、両端は x も y も同じだけ動く', () => {
    const r = dragHandle(rect(), { kind: 'midpoint', index: 2 }, { x: 2500, y: 3600 }, 100)
    expect(r.valid).toBe(true)
    expect(r.footprint).toEqual([
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
      { x: 4500, y: 3600 },
      { x: 500, y: 3600 },
    ])
  })

  it('辺の中点が半端（0.5 mm）でも、動かした後の頂点はすべて整数 mm で、辺は形を保ったまま動く', () => {
    const r = dragHandle(oddTriangle(), { kind: 'midpoint', index: 0 }, { x: 2000, y: 400 }, 100)
    expect(r.valid).toBe(true)
    for (const p of r.footprint) {
      expect(Number.isInteger(p.x)).toBe(true)
      expect(Number.isInteger(p.y)).toBe(true)
    }
    const [a, b, c] = r.footprint as [Pt, Pt, Pt]
    expect(b.x - a.x).toBe(4001) // 両端が同じだけ動いたので、辺の長さと向きは変わらない
    expect(b.y - a.y).toBe(0)
    expect(a.y).toBe(400)
    expect(c).toEqual({ x: 0, y: 3000 }) // 辺に含まれない頂点は動かない
  })
})

describe('外形のつまみ: 動かした先は入力スナップのグリッドに吸着する', () => {
  it('角を動かした先が、段 100 mm の最寄りの格子点になる', () => {
    const r = dragHandle(rect(), { kind: 'corner', index: 2 }, { x: 4234, y: 3678 }, 100)
    expect(r.valid).toBe(true)
    expect(r.footprint[2]).toEqual({ x: 4200, y: 3700 })
  })

  it('段を 1000 mm にすると、同じ位置でも 1000 mm の最寄りの格子点になる', () => {
    const r = dragHandle(rect(), { kind: 'corner', index: 2 }, { x: 4234, y: 3678 }, 1000)
    expect(r.valid).toBe(true)
    expect(r.footprint[2]).toEqual({ x: 4000, y: 4000 })
  })

  it('負の座標側でも最寄りの格子点になる', () => {
    const r = dragHandle(rect(), { kind: 'corner', index: 0 }, { x: -234, y: -678 }, 100)
    expect(r.valid).toBe(true)
    expect(r.footprint[0]).toEqual({ x: -200, y: -700 })
  })

  it('辺の中点も、動かした先（中点の新しい位置）が最寄りの格子点になる', () => {
    // 辺 0 の中点 (2000, 0) を (2060, 380) へ → 吸着先 (2100, 400)。両端は (+100, +400) 動く
    const r = dragHandle(rect(), { kind: 'midpoint', index: 0 }, { x: 2060, y: 380 }, 100)
    expect(r.valid).toBe(true)
    expect(r.footprint).toEqual([
      { x: 100, y: 400 },
      { x: 4100, y: 400 },
      { x: 4000, y: 3000 },
      { x: 0, y: 3000 },
    ])
  })

  it('段が 1 mm のとき、小数のポインタ位置は整数 mm に丸まる', () => {
    const r = dragHandle(rect(), { kind: 'corner', index: 2 }, { x: 4000.4, y: 3000.6 }, 1)
    expect(r.valid).toBe(true)
    expect(r.footprint[2]).toEqual({ x: 4000, y: 3001 })
  })

  it('段が 0・負・数でないときは 1 mm の段として扱い、NaN の座標を作らない', () => {
    for (const step of [0, -100, Number.NaN]) {
      const r = dragHandle(rect(), { kind: 'corner', index: 2 }, { x: 4000.4, y: 3000.6 }, step)
      expect(r.valid).toBe(true)
      expect(r.footprint[2]).toEqual({ x: 4000, y: 3001 })
    }
  })
})

describe('外形のつまみ: 単純多角形でなければ、動かす前の形に戻す', () => {
  it('角を向かいの辺の向こうへ動かして自己交差すると、弾かれて元の形のまま', () => {
    const r = dragHandle(rect(), { kind: 'corner', index: 1 }, { x: 4000, y: 6000 }, 100)
    expect(r.valid).toBe(false)
    expect(r.footprint).toEqual(rect())
  })

  it('辺の中点を動かして自己交差すると、弾かれて元の形のまま（L 字）', () => {
    // 辺 3（頂点 3 と 4）の中点 (2000, 4000) を左へ 3000 動かすと、辺 2 と辺 5 が交差する
    const r = dragHandle(lShape(), { kind: 'midpoint', index: 3 }, { x: -1000, y: 4000 }, 100)
    expect(r.valid).toBe(false)
    expect(r.footprint).toEqual(lShape())
  })

  it('隣の頂点と同じ位置に重ねて長さ 0 の辺ができる動かし方も弾く', () => {
    const r = dragHandle(rect(), { kind: 'corner', index: 1 }, { x: 0, y: 0 }, 100)
    expect(r.valid).toBe(false)
    expect(r.footprint).toEqual(rect())
  })

  it('三角形でも、隣の頂点に重ねて長さ 0 の辺ができる動かし方は弾く', () => {
    const r = dragHandle(oddTriangle(), { kind: 'corner', index: 1 }, { x: 0, y: 0 }, 100)
    expect(r.valid).toBe(false)
    expect(r.footprint).toEqual(oddTriangle())
  })

  it('三角形が一直線につぶれて面積 0 になる動かし方も弾く', () => {
    // 頂点 2 を辺 0 の上 (2000, 0) へ動かすと、3 点が一直線に並ぶ
    const r = dragHandle(oddTriangle(), { kind: 'corner', index: 2 }, { x: 2000, y: 0 }, 100)
    expect(r.valid).toBe(false)
    expect(r.footprint).toEqual(oddTriangle())
  })

  it('存在しないつまみ（番号が範囲外）は何も動かさず、弾く', () => {
    const r = dragHandle(rect(), { kind: 'corner', index: 9 }, { x: 100, y: 100 }, 100)
    expect(r.valid).toBe(false)
    expect(r.footprint).toEqual(rect())
  })

  it('凹んでも自己交差しなければ受け入れる（矢じり形）', () => {
    const r = dragHandle(rect(), { kind: 'corner', index: 2 }, { x: 1000, y: 1000 }, 100)
    expect(r.valid).toBe(true)
    expect(r.footprint).toEqual([
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
      { x: 1000, y: 1000 },
      { x: 0, y: 3000 },
    ])
  })
})

describe('外形のつまみ: 当たり判定は 12 px（画面）', () => {
  // mmPerPx = 画面の 1 px が何 mm か（ビューポートの拡大率）。10 なら 12 px = 120 mm
  it('当たり判定の半径は 12 px', () => {
    expect(HANDLE_HIT_RADIUS_PX).toBe(12)
  })

  it('つまみの中心から 12 px 以内なら当たり、12 px を超えると外れる（10 mm/px: 120 mm）', () => {
    const hs = footprintHandles(rect())
    expect(hitTestHandle(hs, { x: 119, y: 0 }, 10)).toMatchObject({ kind: 'corner', index: 0 })
    expect(hitTestHandle(hs, { x: 121, y: 0 }, 10)).toBeNull()
  })

  it('拡大率が違っても、画面上で 12 px のまま（2 mm/px なら 24 mm、0.5 mm/px なら 6 mm）', () => {
    const hs = footprintHandles(rect())
    expect(hitTestHandle(hs, { x: 23, y: 0 }, 2)).toMatchObject({ kind: 'corner', index: 0 })
    expect(hitTestHandle(hs, { x: 25, y: 0 }, 2)).toBeNull()
    expect(hitTestHandle(hs, { x: 5, y: 0 }, 0.5)).toMatchObject({ kind: 'corner', index: 0 })
    expect(hitTestHandle(hs, { x: 7, y: 0 }, 0.5)).toBeNull()
  })

  it('当たりは円で見る（斜めに 9 px ずつ離れた 12.7 px は外れ、8 px ずつの 11.3 px は当たる）', () => {
    const hs = footprintHandles(rect())
    expect(hitTestHandle(hs, { x: 80, y: 80 }, 10)).toMatchObject({ kind: 'corner', index: 0 })
    expect(hitTestHandle(hs, { x: 90, y: 90 }, 10)).toBeNull()
  })

  it('辺の中点のつまみにも当たる', () => {
    const hs = footprintHandles(rect())
    expect(hitTestHandle(hs, { x: 2000, y: 100 }, 10)).toMatchObject({ kind: 'midpoint', index: 0 })
  })

  it('角と辺の中点が両方圏内のときは、近い方が選ばれる', () => {
    // 幅 200 mm の辺: 角 0 (0,0)、中点 0 (100,0)、角 1 (200,0)。圏内は 120 mm
    const narrow: Pt[] = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 3000 },
      { x: 0, y: 3000 },
    ]
    const hs = footprintHandles(narrow)
    expect(hitTestHandle(hs, { x: 70, y: 0 }, 10)).toMatchObject({ kind: 'midpoint', index: 0 })
    expect(hitTestHandle(hs, { x: 20, y: 0 }, 10)).toMatchObject({ kind: 'corner', index: 0 })
  })

  it('どのつまみからも遠ければ当たらない（null）', () => {
    expect(hitTestHandle(footprintHandles(rect()), { x: 1000, y: 1000 }, 10)).toBeNull()
    expect(hitTestHandle([], { x: 0, y: 0 }, 10)).toBeNull()
  })
})
