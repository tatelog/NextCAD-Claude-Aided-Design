// 仕様（統括の依頼 2026-11-06。1: 配置図の周辺建物を筆のまわりに限る。2: 収まる縮尺が無いときは理由を正しく出す）:
// SL0: 周辺建物を入れる範囲は、筆（と外形）の外接矩形から 40 m。一か所の定数にする。
// SL1: 範囲の中に頂点がすべて入る建物だけ配置図に入れる。範囲の外の建物は入れない。
// SL2: 一点でも範囲の外へ出る建物は入れない（はみ出して描かない）。
// SL3: 縮尺は、筆と外形と範囲の中の建物で決める。400 m 先の建物があっても縮尺は変わらない。
// SL4: 筆が大きく、どの標準の縮尺でも図枠の作図領域に収まらないときは、図を作らず「noFit」（収まる縮尺が無い）。
// SL5: 筆も外形も無いときは、図を作らず「notConfirmed」（敷地を確定すると出せます）。
// SL6: 理由の文言。作れるときは理由が無い（null）。
// SL7: 実データに近い形（筆 25 m × 40 m、周辺の建物が 400 m 四方に散らばる）で、縮尺が決まる。
// SL8: 配置図の中身は、作図の領域の外へ出ない。
import { describe, expect, it } from 'vitest'
import { drawingAreaOf } from '../law/permitFrameSvg'
import { siteLayoutStateOf, siteMissingTextOf, SITE_NEIGHBOR_MARGIN_MM, STANDARD_SCALES, type SiteLayoutState } from './drawingSvg'

const AREA = drawingAreaOf('A3')
const sq = (x0: number, y0: number, x1: number, y1: number) => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
]
const LOT = sq(0, 0, 20000, 30000)
const FOOT = sq(2000, 3000, 18000, 27000)
const neighborCount = (body: string) => (body.match(/data-role="neighbor"/g) ?? []).length
const okOf = (s: SiteLayoutState) => {
  if (s.kind !== 'ok') throw new Error(`ok ではない: ${s.kind}`)
  return s
}
/** 中身の path の d から、すべての点（x, y）を取る */
const pointsOf = (body: string): { x: number; y: number }[] => {
  const out: { x: number; y: number }[] = []
  for (const m of body.matchAll(/d="([^"]+)"/g)) {
    const nums = (m[1]!.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
    for (let i = 0; i + 1 < nums.length; i += 2) out.push({ x: nums[i]!, y: nums[i + 1]! })
  }
  return out
}

describe('周辺建物は筆のまわりに限る（仕様 SL0・SL1・SL2）', () => {
  it('SL0: 範囲は 40 m（一か所の定数）', () => {
    expect(SITE_NEIGHBOR_MARGIN_MM).toBe(40_000)
  })

  it('SL1: 範囲の中の建物は入り、範囲の外の建物は入らない', () => {
    const near = sq(-20000, 5000, -10000, 9000)
    const far = sq(100000, 0, 101000, 1000)
    const r = okOf(siteLayoutStateOf({ lot: LOT, footprint: FOOT, neighbors: [near, far], area: AREA }))
    expect(neighborCount(r.body)).toBe(1)
  })

  it('SL2: 一点でも範囲の外へ出る建物は入れない', () => {
    // 範囲の右の辺は 20000 + 40000 = 60000 mm。x 70000 まで伸びる建物は入れない
    const straddle = sq(50000, 0, 70000, 10000)
    const r = okOf(siteLayoutStateOf({ lot: LOT, footprint: FOOT, neighbors: [straddle], area: AREA }))
    expect(neighborCount(r.body)).toBe(0)
  })
})

describe('縮尺は筆のまわりで決める（仕様 SL3）', () => {
  it('SL3: 400 m 先の建物があっても、縮尺は変わらず、その建物は入らない', () => {
    const alone = okOf(siteLayoutStateOf({ lot: LOT, footprint: FOOT, neighbors: [], area: AREA }))
    const withFar = okOf(
      siteLayoutStateOf({
        lot: LOT,
        footprint: FOOT,
        neighbors: [sq(400000, 0, 401000, 1000), sq(-400000, -400000, -399000, -399000)],
        area: AREA,
      }),
    )
    expect(withFar.denominator).toBe(alone.denominator)
    expect(neighborCount(withFar.body)).toBe(0)
  })
})

describe('収まらないとき・筆が無いとき（仕様 SL4・SL5）', () => {
  it('SL4: 筆が 1 km 四方で、どの標準の縮尺でも収まらなければ noFit（図は作らない）', () => {
    const r = siteLayoutStateOf({ lot: sq(0, 0, 1000000, 1000000), footprint: null, neighbors: [], area: AREA })
    expect(r.kind).toBe('noFit')
  })

  it('SL5: 筆も外形も無ければ、周辺建物があっても notConfirmed（図は作らない）', () => {
    const r = siteLayoutStateOf({ lot: null, footprint: null, neighbors: [sq(-20000, 5000, -10000, 9000)], area: AREA })
    expect(r.kind).toBe('notConfirmed')
  })
})

describe('理由の文言（仕様 SL6）', () => {
  it('SL6: noFit は「敷地が大きく、図枠に収まる縮尺が無い」、notConfirmed は「敷地を確定すると出せます」、ok は理由なし', () => {
    expect(siteMissingTextOf({ kind: 'noFit' })).toBe('敷地が大きく、図枠に収まる縮尺が無い')
    expect(siteMissingTextOf({ kind: 'notConfirmed' })).toBe('敷地を確定すると出せます')
    expect(siteMissingTextOf(okOf(siteLayoutStateOf({ lot: LOT, footprint: FOOT, neighbors: [], area: AREA })))).toBeNull()
  })
})

describe('実データに近い形（仕様 SL7・SL8）', () => {
  // 筆 25 m × 40 m。周辺の建物を、筆のまわり 400 m 四方に 15 m 角で散らす（以前は縮尺が決まらず図が出なかった）
  const lot = sq(0, 0, 25000, 40000)
  const foot = sq(3000, 4000, 22000, 36000)
  const neighbors: { x: number; y: number }[][] = []
  for (let i = -8; i <= 8; i++) {
    for (let j = -8; j <= 8; j++) {
      const x = i * 50000 + 3000
      const y = j * 50000 + 3000
      neighbors.push(sq(x, y, x + 15000, y + 15000))
    }
  }

  it('SL7: 周辺の建物が散らばっていても、縮尺が決まり（ok）、標準の縮尺のどれかになる', () => {
    const r = okOf(siteLayoutStateOf({ lot, footprint: foot, neighbors, area: AREA }))
    expect([...STANDARD_SCALES]).toContain(r.denominator)
    expect(neighborCount(r.body)).toBeGreaterThan(0)
  })

  it('SL8: 配置図の中身（筆・外形・周辺の建物）は、作図の領域の外へ出ない', () => {
    const r = okOf(siteLayoutStateOf({ lot, footprint: foot, neighbors, area: AREA }))
    for (const p of pointsOf(r.body)) {
      expect(p.x).toBeGreaterThanOrEqual(AREA.x0 - 0.01)
      expect(p.x).toBeLessThanOrEqual(AREA.x1 + 0.01)
      expect(p.y).toBeGreaterThanOrEqual(AREA.y0 - 0.01)
      expect(p.y).toBeLessThanOrEqual(AREA.y1 + 0.01)
    }
  })
})
