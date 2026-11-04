// 外形を store に確定する側（ハブ A-03 G65「つまみで外形の変更を容易にする」）の仕様テスト。
//
// 仕様: 外形を動かすときは nodes の座標を書き換える。segments は端点の ID で参照するが、
//       座標（x1, y1, x2, y2）も持つ。端点だけ書き換えると線分の座標が食い違い、閉じた外形
//       （findClosedOutline は線分の座標から外形を作る）が動かない。そこで線分の座標も揃える。
//  1. 動かすのは頂点（端点）だけ。ID・つながり・ほかの端点は変えない
//  2. 端点は ID で共有されるので、別のストロークの線分でも同じ座標になる
//  3. 動かした後の閉じた外形（findClosedOutline）が、渡した形になる
//  4. 曲線（spline）は制御点の両端を端点にそろえる。辺ごと動かすときは間の制御点も一緒に動く
//  5. 変えた線分の revision を 1 進める
//  6. 入力の entries は書き換えない
//
// 回転（ハブ A-03 G71）も同じ書き換えで確定する。仮置き:
//  - 回転の中心は外形の重心。正の角度は反時計回り（mm の +y が画面の上。既存の rotateFootprint と同じ向き）
//  - 回した結果の頂点は mm の整数に丸める（座標は整数 mm のまま。extrudeVolume は整数 mm の外形しか受け付けない）
//  - 回すと外形の座標が変わり、斜線・日影は既存の処理で計算し直される（外形が extrudeVolume に通ること）
import { describe, expect, it } from 'vitest'
import type { Node, Segment } from '../model/schema'
import { extrudeVolume } from '../volume/extrude'
import { dragHandle, type HandleRef } from '../volume/footprintHandles'
import { outlineCentroid } from '../volume/rotation'
import { findClosedOutline } from './closure'
import { moveOutlineVertices, rotateOutline } from './outlineEdit'

type Pt = { x: number; y: number }
interface Entry {
  tag: string
  nodes: Node[]
  segments: Segment[]
}

const node = (id: string, x: number, y: number): Node => ({ id, x, y })
const seg = (id: string, a: Node, b: Node, extra: Partial<Segment> = {}): Segment => ({
  id,
  x1: a.x,
  y1: a.y,
  x2: b.x,
  y2: b.y,
  start_node_id: a.id,
  end_node_id: b.id,
  snap: 'none',
  stage: 'F4',
  revision: 1,
  curve: 'line',
  ...extra,
})

// 4000 x 3000 mm の長方形。端点 n1〜n3 と線分 a・b は 1 本目のストローク（entry A）、
// 端点 n4 と線分 c・d は 2 本目（entry B）。線分 d は A の端点 n1 を共有して使う
const squareEntries = (extraSegmentA: Partial<Segment> = {}): Entry[] => {
  const n1 = node('n1', 0, 0)
  const n2 = node('n2', 4000, 0)
  const n3 = node('n3', 4000, 3000)
  const n4 = node('n4', 0, 3000)
  return [
    { tag: 'A', nodes: [n1, n2, n3], segments: [seg('a', n1, n2, extraSegmentA), seg('b', n2, n3)] },
    { tag: 'B', nodes: [n4], segments: [seg('c', n3, n4), seg('d', n4, n1)] },
  ]
}

const from = (): Pt[] => [
  { x: 0, y: 0 },
  { x: 4000, y: 0 },
  { x: 4000, y: 3000 },
  { x: 0, y: 3000 },
]

const nodesOf = (es: Entry[]): Node[] => es.flatMap((e) => e.nodes)
const segmentsOf = (es: Entry[]): Segment[] => es.flatMap((e) => e.segments)
const outlineOf = (es: Entry[]): Pt[] => {
  const r = findClosedOutline(segmentsOf(es))
  if (!r.closed) throw new Error('外形が閉じていない')
  return r.footprint.map((p) => ({ x: p.x, y: p.y }))
}
const row = (s: Segment) => [s.id, s.start_node_id, s.end_node_id, s.x1, s.y1, s.x2, s.y2]

describe('外形の確定: 角を動かすと、その端点と、それにつながる線分の端だけが変わる', () => {
  const to = (): Pt[] => [
    { x: 0, y: 0 },
    { x: 4000, y: 0 },
    { x: 4200, y: 3700 },
    { x: 0, y: 3000 },
  ]

  it('端点の座標が変わる（動かしたのは n3 だけ。ID はそのまま）', () => {
    const moved = moveOutlineVertices(squareEntries(), from(), to())
    expect(nodesOf(moved).map((n) => [n.id, n.x, n.y])).toEqual([
      ['n1', 0, 0],
      ['n2', 4000, 0],
      ['n3', 4200, 3700],
      ['n4', 0, 3000],
    ])
  })

  it('線分の座標（x1, y1, x2, y2）も端点に合わせて変わる。ID とつながりは変わらない', () => {
    const moved = moveOutlineVertices(squareEntries(), from(), to())
    expect(segmentsOf(moved).map(row)).toEqual([
      ['a', 'n1', 'n2', 0, 0, 4000, 0],
      ['b', 'n2', 'n3', 4000, 0, 4200, 3700],
      ['c', 'n3', 'n4', 4200, 3700, 0, 3000],
      ['d', 'n4', 'n1', 0, 3000, 0, 0],
    ])
  })

  it('動かした後の閉じた外形は、渡した形になる', () => {
    const moved = moveOutlineVertices(squareEntries(), from(), to())
    expect(outlineOf(moved)).toEqual(to())
  })

  it('端点を共有する別のストロークの線分も同じ座標になる（n1 は entry A の端点、線分 d は entry B）', () => {
    const toFirst: Pt[] = [
      { x: 100, y: 400 },
      { x: 4000, y: 0 },
      { x: 4000, y: 3000 },
      { x: 0, y: 3000 },
    ]
    const moved = moveOutlineVertices(squareEntries(), from(), toFirst)
    const [a, b] = moved
    expect(a!.nodes.find((n) => n.id === 'n1')).toEqual({ id: 'n1', x: 100, y: 400 })
    expect(b!.segments.find((s) => s.id === 'd')).toMatchObject({ x2: 100, y2: 400 })
    expect(a!.segments.find((s) => s.id === 'a')).toMatchObject({ x1: 100, y1: 400 })
  })
})

describe('外形の確定: 辺の両端を同時に動かす（辺の中点のつまみ）', () => {
  it('両端が同じだけ動き、その端につながる線分の端も追従する', () => {
    const to: Pt[] = [
      { x: 100, y: 400 },
      { x: 4100, y: 400 },
      { x: 4000, y: 3000 },
      { x: 0, y: 3000 },
    ]
    const moved = moveOutlineVertices(squareEntries(), from(), to)
    expect(segmentsOf(moved).map(row)).toEqual([
      ['a', 'n1', 'n2', 100, 400, 4100, 400],
      ['b', 'n2', 'n3', 4100, 400, 4000, 3000],
      ['c', 'n3', 'n4', 4000, 3000, 0, 3000],
      ['d', 'n4', 'n1', 0, 3000, 100, 400],
    ])
    expect(outlineOf(moved)).toEqual(to)
  })

  it('動かした先が、動かす前の別の頂点の位置と重なっても、連鎖せず同時に置き換える', () => {
    // 辺 0（n1 と n2）を、辺の長さ 4000 mm だけ右へ動かす。n1 の行き先は n2 の元の位置
    const to: Pt[] = [
      { x: 4000, y: 0 },
      { x: 8000, y: 0 },
      { x: 4000, y: 3000 },
      { x: 0, y: 3000 },
    ]
    const moved = moveOutlineVertices(squareEntries(), from(), to)
    expect(nodesOf(moved).map((n) => [n.id, n.x, n.y])).toEqual([
      ['n1', 4000, 0],
      ['n2', 8000, 0],
      ['n3', 4000, 3000],
      ['n4', 0, 3000],
    ])
    expect(outlineOf(moved)).toEqual(to)
  })
})

describe('外形の確定: revision・入力の保持', () => {
  const toCorner = (): Pt[] => [
    { x: 0, y: 0 },
    { x: 4000, y: 0 },
    { x: 4200, y: 3700 },
    { x: 0, y: 3000 },
  ]

  it('座標が変わった線分（b・c）だけ revision を 1 進め、変わらない線分（a・d）はそのまま', () => {
    const moved = moveOutlineVertices(squareEntries(), from(), toCorner())
    expect(segmentsOf(moved).map((s) => [s.id, s.revision])).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 2],
      ['d', 1],
    ])
  })

  it('entry の stroke など、端点・線分以外の項目は保つ', () => {
    const moved = moveOutlineVertices(squareEntries(), from(), toCorner())
    expect(moved.map((e) => e.tag)).toEqual(['A', 'B'])
  })

  it('入力の entries は書き換えない', () => {
    const entries = squareEntries()
    moveOutlineVertices(entries, from(), toCorner())
    expect(entries).toEqual(squareEntries())
  })

  it('動いていない（from と to が同じ）なら、何も変えず revision も進めない', () => {
    const moved = moveOutlineVertices(squareEntries(), from(), from())
    expect(moved).toEqual(squareEntries())
  })

  it('from と to の頂点数が違えば、何も変えない', () => {
    const moved = moveOutlineVertices(squareEntries(), from(), toCorner().slice(0, 3))
    expect(moved).toEqual(squareEntries())
  })
})

describe('外形の確定: 曲線（spline）の制御点', () => {
  // 線分 a（n1 から n2）を、上へ膨らむ spline にする。制御点の両端は端点と同じ位置
  const controlPoints = (): Pt[] => [
    { x: 0, y: 0 },
    { x: 1000, y: -500 },
    { x: 3000, y: -500 },
    { x: 4000, y: 0 },
  ]
  const splineEntries = () => squareEntries({ curve: 'spline', curve_params: { control_points: controlPoints() } })
  const cpOf = (es: Entry[]): Pt[] => {
    const a = segmentsOf(es).find((s) => s.id === 'a')!
    return (a.curve_params as { control_points: Pt[] }).control_points
  }

  it('片方の端点だけ動かすと、制御点の両端は端点にそろい、間の制御点は動かない', () => {
    const to: Pt[] = [
      { x: 0, y: 0 },
      { x: 4200, y: 300 },
      { x: 4000, y: 3000 },
      { x: 0, y: 3000 },
    ]
    const moved = moveOutlineVertices(splineEntries(), from(), to)
    expect(cpOf(moved)).toEqual([
      { x: 0, y: 0 },
      { x: 1000, y: -500 },
      { x: 3000, y: -500 },
      { x: 4200, y: 300 },
    ])
  })

  it('両端を同じだけ動かす（辺ごと動かす）と、間の制御点も同じだけ動き、曲線の形が保たれる', () => {
    const to: Pt[] = [
      { x: 100, y: 400 },
      { x: 4100, y: 400 },
      { x: 4000, y: 3000 },
      { x: 0, y: 3000 },
    ]
    const moved = moveOutlineVertices(splineEntries(), from(), to)
    expect(cpOf(moved)).toEqual([
      { x: 100, y: 400 },
      { x: 1100, y: -100 },
      { x: 3100, y: -100 },
      { x: 4100, y: 400 },
    ])
  })
})

describe('外形の確定: つまみ（dragHandle）の結果をそのまま確定できる', () => {
  const cases: { name: string; ref: HandleRef; pointer: Pt }[] = [
    { name: '角 2 を (4234, 3678) へ', ref: { kind: 'corner', index: 2 }, pointer: { x: 4234, y: 3678 } },
    { name: '辺 0 の中点を (2060, 380) へ', ref: { kind: 'midpoint', index: 0 }, pointer: { x: 2060, y: 380 } },
    { name: '最後の辺 3 の中点を (-600, 1500) へ', ref: { kind: 'midpoint', index: 3 }, pointer: { x: -600, y: 1500 } },
  ]

  it.each(cases)('$name 動かした形を確定すると、閉じた外形がその形になり、線分の座標と端点の座標が食い違わない', ({ ref, pointer }) => {
    const entries = squareEntries()
    const drag = dragHandle(outlineOf(entries), ref, pointer, 100)
    expect(drag.valid).toBe(true)

    const moved = moveOutlineVertices(entries, outlineOf(entries), drag.footprint)
    expect(outlineOf(moved)).toEqual(drag.footprint)

    const at = new Map(nodesOf(moved).map((n) => [n.id, n]))
    for (const s of segmentsOf(moved)) {
      const a = at.get(s.start_node_id)!
      const b = at.get(s.end_node_id)!
      expect([s.x1, s.y1, s.x2, s.y2]).toEqual([a.x, a.y, b.x, b.y])
    }
  })
})

describe('回転（G71）: 外形の重心を中心に回す', () => {
  // 頂点の列から、端点（n1, n2, ...）と線分（s1, s2, ...）が 1 つの輪になった entries を作る
  const loop = (pts: Pt[], segExtra: Record<string, Partial<Segment>> = {}): Entry[] => {
    const nodes = pts.map((p, i) => node(`n${i + 1}`, p.x, p.y))
    const segments = nodes.map((n, i) => seg(`s${i + 1}`, n, nodes[(i + 1) % nodes.length]!, segExtra[`s${i + 1}`] ?? {}))
    return [{ tag: 'loop', nodes, segments }]
  }
  const square = (): Pt[] => [
    { x: 0, y: 0 },
    { x: 4000, y: 0 },
    { x: 4000, y: 4000 },
    { x: 0, y: 4000 },
  ]
  const rectPts = (): Pt[] => [
    { x: 0, y: 0 },
    { x: 4000, y: 0 },
    { x: 4000, y: 3000 },
    { x: 0, y: 3000 },
  ]
  const lPts = (): Pt[] => [
    { x: 0, y: 0 },
    { x: 6000, y: 0 },
    { x: 6000, y: 2000 },
    { x: 2000, y: 2000 },
    { x: 2000, y: 6000 },
    { x: 0, y: 6000 },
  ]
  const edgeLengths = (poly: Pt[]): number[] =>
    poly.map((p, i) => {
      const q = poly[(i + 1) % poly.length]!
      return Math.hypot(q.x - p.x, q.y - p.y)
    })
  const areaOf = (poly: Pt[]): number =>
    Math.abs(
      poly.reduce((sum, p, i) => {
        const q = poly[(i + 1) % poly.length]!
        return sum + p.x * q.y - q.x * p.y
      }, 0),
    ) / 2
  const allCoordinates = (es: Entry[]): number[] => [
    ...nodesOf(es).flatMap((n) => [n.x, n.y]),
    ...segmentsOf(es).flatMap((s) => [s.x1, s.y1, s.x2, s.y2]),
  ]

  it('正方形を 90° 回すと、頂点が重心 (2000, 2000) のまわりに反時計回りに移る', () => {
    const rotated = rotateOutline(loop(square()), 90)
    expect(nodesOf(rotated).map((n) => [n.id, n.x, n.y])).toEqual([
      ['n1', 4000, 0],
      ['n2', 4000, 4000],
      ['n3', 0, 4000],
      ['n4', 0, 0],
    ])
  })

  it('負の角度は時計回り（-90° で、90° とは逆向きに移る）', () => {
    const rotated = rotateOutline(loop(square()), -90)
    expect(nodesOf(rotated).map((n) => [n.id, n.x, n.y])).toEqual([
      ['n1', 0, 4000],
      ['n2', 0, 0],
      ['n3', 4000, 0],
      ['n4', 4000, 4000],
    ])
  })

  it('正方形を 90° 回しても、辺の長さと面積は変わらない', () => {
    const out = outlineOf(rotateOutline(loop(square()), 90))
    expect(edgeLengths(out)).toEqual([4000, 4000, 4000, 4000])
    expect(areaOf(out)).toBe(16_000_000)
  })

  it('90° でない角度（30°）でも、辺の長さは 2 mm 以内、面積は 0.1 % 以内で変わらない（整数 mm への丸めの分だけ）', () => {
    const out = outlineOf(rotateOutline(loop(rectPts()), 30))
    const lengths = edgeLengths(out)
    ;[4000, 3000, 4000, 3000].forEach((expected, i) => {
      expect(Math.abs(lengths[i]! - expected)).toBeLessThanOrEqual(2)
    })
    expect(Math.abs(areaOf(out) - 12_000_000) / 12_000_000).toBeLessThan(0.001)
  })

  it('回転の中心は外形の重心: 凹んだ外形（L 字、重心 (2200, 2200)）を 30° 回しても、重心は 2 mm 以内しか動かない', () => {
    const out = outlineOf(rotateOutline(loop(lPts()), 30))
    const c = outlineCentroid(out)
    expect(Math.abs(c!.x - 2200)).toBeLessThanOrEqual(2)
    expect(Math.abs(c!.y - 2200)).toBeLessThanOrEqual(2)
  })

  it('回した後の端点と線分の座標は、すべて整数 mm（-0 も無い）', () => {
    const rotated = rotateOutline(loop(lPts()), 17)
    const all = allCoordinates(rotated)
    expect(all.length).toBeGreaterThan(0)
    for (const v of all) {
      expect(Number.isInteger(v)).toBe(true)
      expect(Object.is(v, -0)).toBe(false)
    }
  })

  it('線分の座標は端点に合い、閉じた外形は端点の並びのまま回った形になる', () => {
    const rotated = rotateOutline(loop(lPts()), 17)
    const at = new Map(nodesOf(rotated).map((n) => [n.id, n]))
    for (const s of segmentsOf(rotated)) {
      const a = at.get(s.start_node_id)!
      const b = at.get(s.end_node_id)!
      expect([s.x1, s.y1, s.x2, s.y2]).toEqual([a.x, a.y, b.x, b.y])
    }
    expect(outlineOf(rotated)).toEqual(nodesOf(rotated).map((n) => ({ x: n.x, y: n.y })))
  })

  it('回した外形は extrudeVolume（整数 mm の外形だけを受け付ける）にそのまま通り、建築面積はほぼ変わらない', () => {
    const footprint = outlineOf(rotateOutline(loop(rectPts()), 17))
    const volume = extrudeVolume({ footprint, storey_count: 5, storey_height: 3000 })
    expect(Math.abs(volume.building_area_mm2 - 12_000_000) / 12_000_000).toBeLessThan(0.001)
  })

  it('0° と 360° は何も変えない（revision も進めない）', () => {
    expect(rotateOutline(loop(rectPts()), 0)).toEqual(loop(rectPts()))
    expect(rotateOutline(loop(rectPts()), 360)).toEqual(loop(rectPts()))
  })

  it('座標が変わった線分の revision を 1 進める', () => {
    const rotated = rotateOutline(loop(square()), 90)
    expect(segmentsOf(rotated).map((s) => [s.id, s.revision])).toEqual([
      ['s1', 2],
      ['s2', 2],
      ['s3', 2],
      ['s4', 2],
    ])
  })

  it('曲線（spline）の制御点も同じ回転で回り、両端は端点に一致する', () => {
    const control: Pt[] = [
      { x: 0, y: 0 },
      { x: 1000, y: -500 },
      { x: 3000, y: -500 },
      { x: 4000, y: 0 },
    ]
    const rotated = rotateOutline(loop(square(), { s1: { curve: 'spline', curve_params: { control_points: control } } }), 90)
    const s1 = segmentsOf(rotated).find((s) => s.id === 's1')!
    expect((s1.curve_params as { control_points: Pt[] }).control_points).toEqual([
      { x: 4000, y: 0 },
      { x: 4500, y: 1000 },
      { x: 4500, y: 3000 },
      { x: 4000, y: 4000 },
    ])
    expect([s1.x1, s1.y1, s1.x2, s1.y2]).toEqual([4000, 0, 4000, 4000])
  })

  it('外形が閉じていない（重心を決める外形が無い）ときは、何も変えない', () => {
    const open = loop(square()).map((e) => ({ ...e, segments: e.segments.slice(0, 3) }))
    expect(rotateOutline(open, 90)).toEqual(open)
  })

  it('入力の entries は書き換えない。端点・線分以外の項目は保つ', () => {
    const entries = loop(lPts())
    const rotated = rotateOutline(entries, 17)
    expect(entries).toEqual(loop(lPts()))
    expect(rotated.map((e) => e.tag)).toEqual(['loop'])
  })
})
