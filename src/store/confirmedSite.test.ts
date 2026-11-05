// 仕様（統括の依頼 2026-11-06。1: P1 の「この敷地で確定」。確定した敷地を P2〜P5 が使う）:
// 仕様 1f: 確定した敷地を入れると読める。取り消すと、確定していない状態に戻る。
// 仕様 1g: 確定のあとに、地点か筆を変えたら「確定し直しが要る」（古い確定として判定する）。同じなら、そうならない。
// 仕様 1h: 確定した敷地の平面は、筆が無いとき（lot が null）は、ダミーの筆界を使う（null を返す）。
import { beforeEach, describe, expect, it } from 'vitest'
import { isConfirmedStaleOf, lotOfConfirmed, useConfirmedSite, type ConfirmedSite } from './confirmedSite'

const LOT = [
  { x: 0, y: 0 },
  { x: 1000, y: 0 },
  { x: 1000, y: 1000 },
  { x: 0, y: 1000 },
]
const CENTER = { lat: 35.667125, lon: 139.829867 }
const confirmed = (over: Partial<ConfirmedSite> = {}): ConfirmedSite => ({
  parcelUid: '筆A',
  lot: LOT,
  frame: null,
  center: CENTER,
  roadEdge: 0,
  ...over,
})

beforeEach(() => useConfirmedSite.setState({ confirmed: null, currentSite: null }))

describe('確定した敷地（仕様 1f〜1h）', () => {
  it('仕様 1f: 確定した敷地を入れて読め、取り消すと確定していない状態に戻る', () => {
    useConfirmedSite.getState().confirm(confirmed())
    expect(useConfirmedSite.getState().confirmed?.parcelUid).toBe('筆A')
    useConfirmedSite.getState().clear()
    expect(useConfirmedSite.getState().confirmed).toBeNull()
  })

  it('仕様 1g: 地点か筆が変われば確定し直しが要る。同じなら要らない', () => {
    const c = confirmed()
    expect(isConfirmedStaleOf(null, '筆A', CENTER)).toBe(false)
    expect(isConfirmedStaleOf(c, '筆A', CENTER)).toBe(false)
    expect(isConfirmedStaleOf(c, '筆B', CENTER)).toBe(true)
    expect(isConfirmedStaleOf(c, '筆A', { lat: 35.6, lon: 139.8 })).toBe(true)
    expect(isConfirmedStaleOf(c, null, null)).toBe(true)
  })

  it('仕様 1h: 筆が無い確定（lot が null）は、ダミーの筆界を使う（null を返す）', () => {
    expect(lotOfConfirmed(confirmed({ lot: null, parcelUid: null }))).toBeNull()
    expect(lotOfConfirmed(confirmed())).toEqual(LOT)
    expect(lotOfConfirmed(null)).toBeNull()
  })
})

// 統括の依頼 2026-11-06（不具合）: 確定した直後に「確定し直しが要る」が出ない。確定の処理は、地点を筆の中の点へ動かしてから P2 へ移るので、
// P1 の「今いる地点」の更新は動かない。だから、確定の店舗が、確定したときに今いる地点も確定の中心にする。
describe('確定の直後（仕様 1g2）', () => {
  it('仕様 1g2: 確定した直後は、確定し直しの表示が出ない（今いる地点も確定の中心になる）', () => {
    const c = confirmed({ center: { lat: 35.667125, lon: 139.829867 } })
    useConfirmedSite.getState().confirm(c)
    const s = useConfirmedSite.getState()
    expect(s.currentSite).toEqual({ lat: 35.667125, lon: 139.829867 })
    expect(isConfirmedStaleOf(s.confirmed, '筆A', s.currentSite)).toBe(false)
  })
})

// 統括の依頼 2026-11-06。6: 前面道路の辺は P2 の手入力のまま。確定の前に P2 で選んだ番号も、確定のまとめに入る。
describe('前面道路の辺（仕様 6a・6b）', () => {
  it('仕様 6a: 確定の前に P2 で選んだ辺の番号を持ち、確定のまとめに使える', () => {
    useConfirmedSite.getState().setRoadEdge(3)
    expect(useConfirmedSite.getState().roadEdge).toBe(3)
  })

  it('仕様 6b: 確定の後に選び直せば、確定の辺の番号も変わる', () => {
    useConfirmedSite.getState().confirm(confirmed({ roadEdge: 0 }))
    useConfirmedSite.getState().setRoadEdge(2)
    expect(useConfirmedSite.getState().roadEdge).toBe(2)
    expect(useConfirmedSite.getState().confirmed?.roadEdge).toBe(2)
  })
})
