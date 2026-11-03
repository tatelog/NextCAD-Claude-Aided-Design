// 仕様: D-02 C1「スナップ先と優先順」（仮置き）と「吸着半径」（24 px は仮置き）。
// 優先順: ①既存の端点 ②既存の線分の交点 ③既存の線分上（垂線の足） ④水平・垂直（±3 度） ⑤入力スナップのグリッド交点。
// 表示グリッドと入力スナップは別設定（D-02 C1）。
import { describe, expect, it } from 'vitest'
import { SNAP_RADIUS_PX, snapPoint, snapRadiusMm, type SnapContext } from './snap'
import type { Node, Segment } from '../model/schema'

const seg = (id: string, x1: number, y1: number, x2: number, y2: number): Segment => ({
  id,
  x1,
  y1,
  x2,
  y2,
  start_node_id: `${id}-a`,
  end_node_id: `${id}-b`,
  snap: 'none',
  stage: 'F4',
  revision: 1,
  curve: 'line',
})

const node = (id: string, x: number, y: number): Node => ({ id, x, y })

const ctx = (over: Partial<SnapContext> = {}): SnapContext => ({
  nodes: [],
  segments: [],
  prev: null,
  radiusMm: 50,
  axisDeg: 3,
  gridMm: null,
  ...over,
})

describe('吸着半径（24 px 仮置き）', () => {
  it('24 px は見ている倍率で mm に換算する', () => {
    expect(SNAP_RADIUS_PX).toBe(24)
    expect(snapRadiusMm(20)).toBe(480)
    expect(snapRadiusMm(0.5)).toBe(12)
  })

  it('半径の内側は吸着し、外側は吸着しない', () => {
    const n = node('n1', 0, 0)
    const inside = snapPoint({ x: 470, y: 0 }, ctx({ nodes: [n], radiusMm: snapRadiusMm(20) }))
    expect(inside.snap).toBe('node')
    const outside = snapPoint({ x: 490, y: 0 }, ctx({ nodes: [n], radiusMm: snapRadiusMm(20) }))
    expect(outside.snap).toBe('none')
  })
})

describe('①既存の端点', () => {
  it('端点の近くなら端点の座標と ID を返す（端点の共有）', () => {
    const r = snapPoint({ x: 1010, y: 990 }, ctx({ nodes: [node('n1', 1000, 1000)] }))
    expect(r).toEqual({ x: 1000, y: 1000, snap: 'node', nodeId: 'n1' })
  })

  it('端点は交点・線分上・水平垂直・グリッドより優先される', () => {
    // 2 本の線の交点（5000,5000）の 10 mm 先に端点がある
    const segments = [seg('h', 0, 5000, 10_000, 5000), seg('v', 5000, 0, 5000, 10_000)]
    const r = snapPoint(
      { x: 5010, y: 4990 },
      ctx({ nodes: [node('n1', 5010, 5000)], segments, radiusMm: 50, gridMm: 1000 }),
    )
    expect(r.snap).toBe('node')
    expect(r.nodeId).toBe('n1')
  })
})

describe('②既存の線分の交点', () => {
  it('2 本の線の交点の近くなら交点に吸着する（端点は無い）', () => {
    const segments = [seg('h', 0, 5000, 10_000, 5000), seg('v', 5000, 0, 5000, 10_000)]
    const r = snapPoint({ x: 5010, y: 4990 }, ctx({ segments }))
    expect(r.snap).toBe('intersection')
    expect(r.x).toBeCloseTo(5000, 6)
    expect(r.y).toBeCloseTo(5000, 6)
    expect(r.nodeId).toBeNull()
  })

  it('線分の延長上の交点（線分の外）には吸着しない', () => {
    const segments = [seg('h', 0, 5000, 4000, 5000), seg('v', 5000, 0, 5000, 10_000)]
    const r = snapPoint({ x: 4990, y: 5010 }, ctx({ segments }))
    expect(r.snap).not.toBe('intersection')
  })
})

describe('③既存の線分上（垂線の足）', () => {
  it('線分の近くなら、その線分上の垂線の足に吸着する', () => {
    const segments = [seg('s', 0, 0, 10_000, 0)]
    const r = snapPoint({ x: 3000, y: 30 }, ctx({ segments }))
    expect(r).toMatchObject({ x: 3000, y: 0, snap: 'on_segment', nodeId: null })
  })

  it('垂線の足が線分の外なら吸着しない（端点からの距離で見る）', () => {
    const segments = [seg('s', 0, 0, 10_000, 0)]
    const r = snapPoint({ x: -100, y: 0 }, ctx({ segments }))
    expect(r.snap).toBe('none')
  })
})

describe('④水平・垂直（±3 度）', () => {
  it('直前の頂点から見て ±3 度以内なら水平に揃える', () => {
    const prev = node('p', 0, 0)
    const r = snapPoint({ x: 5000, y: 100 }, ctx({ prev, axisDeg: 3 }))
    expect(r).toMatchObject({ x: 5000, y: 0, snap: 'axis' })
  })

  it('±3 度を超えるなら揃えない', () => {
    const prev = node('p', 0, 0)
    const r = snapPoint({ x: 5000, y: 500 }, ctx({ prev, axisDeg: 3 }))
    expect(r.snap).toBe('none')
  })

  it('直前の頂点が無ければ水平垂直は効かない', () => {
    const r = snapPoint({ x: 5000, y: 100 }, ctx({ prev: null }))
    expect(r.snap).toBe('none')
  })
})

describe('⑤入力スナップのグリッド交点', () => {
  it('グリッドが有効なら、近いグリッド交点に吸着する', () => {
    const r = snapPoint({ x: 2010, y: 3990 }, ctx({ gridMm: 1000 }))
    expect(r).toMatchObject({ x: 2000, y: 4000, snap: 'grid' })
  })

  it('グリッドが無効（null）なら吸着しない', () => {
    const r = snapPoint({ x: 2010, y: 3990 }, ctx({ gridMm: null }))
    expect(r.snap).toBe('none')
  })

  it('水平垂直（④）はグリッド（⑤）より優先される', () => {
    const prev = node('p', 0, 3990)
    const r = snapPoint({ x: 2010, y: 3995 }, ctx({ prev, gridMm: 1000, axisDeg: 3 }))
    expect(r).toMatchObject({ snap: 'axis', y: 3990 })
  })

  it('表示グリッドの有無とは無関係に、入力スナップのグリッドだけで決まる', () => {
    // 表示グリッドを切っていても、入力グリッドが有効なら吸着する（別設定。D-02 C1）
    const r = snapPoint({ x: 2010, y: 3990 }, ctx({ gridMm: 1000 }))
    expect(r.snap).toBe('grid')
  })
})

describe('曲線（spline）は制御点の折れ線で吸着する（弦では吸着しない）', () => {
  // 端 (0,0)〜(10000,0)、制御点の頂点 (5000,3000)。見えている曲線は頂点を通る
  const bulge: Segment = {
    ...seg('B', 0, 0, 10_000, 0),
    curve: 'spline',
    curve_params: {
      control_points: [
        { x: 0, y: 0 },
        { x: 5000, y: 3000 },
        { x: 10_000, y: 0 },
      ],
    },
  }

  it('曲線の上（制御点の折れ線の上）に来たら、そこに吸着する（on_segment）。弦の上 (2500,0) ではない', () => {
    // (2500,1500) は (0,0)〜(5000,3000) の折れ線の上。弦の (2500,0) には吸着しない
    const r = snapPoint({ x: 2500, y: 1500 }, ctx({ segments: [bulge], radiusMm: 50 }))
    expect(r).toMatchObject({ x: 2500, y: 1500, snap: 'on_segment' })
  })

  it('弦の上にあっても、曲線から遠ければ吸着しない', () => {
    const r = snapPoint({ x: 5000, y: 0 }, ctx({ segments: [bulge], radiusMm: 1200 }))
    expect(r.snap).toBe('none')
  })
})

describe('吸着が無いとき', () => {
  it('どれにも当たらないなら座標は変えない', () => {
    const r = snapPoint({ x: 1234, y: 5678 }, ctx({ gridMm: null }))
    expect(r).toEqual({ x: 1234, y: 5678, snap: 'none', nodeId: null })
  })
})
