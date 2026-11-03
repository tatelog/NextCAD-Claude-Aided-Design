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
import { describe, expect, it } from 'vitest'
import type { Node, Segment } from '../model/schema'
import { dragHandle, type HandleRef } from '../volume/footprintHandles'
import { findClosedOutline } from './closure'
import { moveOutlineVertices } from './outlineEdit'

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
