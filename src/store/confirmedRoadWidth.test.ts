// 仕様（統括の依頼 2026-11-06。前面道路の幅員と出どころを店舗へ移し、確定のまとめにも入れる。前面道路の辺と同じ）:
// RW1: 確定のまとめは、幅員（mm）と出どころを持つ。
// RW2: 確定の後に幅員・出どころを変えると、確定のまとめにも反映される（前面道路の辺と同じ）。
// RW3: 確定していなければ、店舗の値だけが変わり、確定のまとめは null のまま。
import { beforeEach, describe, expect, it } from 'vitest'
import { useConfirmedSite, type ConfirmedSite } from './confirmedSite'

const SITE: ConfirmedSite = {
  parcelUid: null,
  lot: null,
  frame: null,
  center: { lat: 35.6, lon: 139.8 },
  roadEdge: 0,
  roadWidthMm: 6000,
  roadSource: '数値指定',
}

beforeEach(() => {
  useConfirmedSite.setState({ confirmed: null, roadWidth: '6000', roadSource: '数値指定' })
})

describe('前面道路の幅員と出どころ（仕様 RW1〜RW3）', () => {
  it('RW1: 確定のまとめは、幅員（mm）と出どころを持つ', () => {
    useConfirmedSite.getState().confirm({ ...SITE, roadWidthMm: 8000, roadSource: '対岸指定' })
    expect(useConfirmedSite.getState().confirmed).toMatchObject({ roadWidthMm: 8000, roadSource: '対岸指定' })
  })

  it('RW2: 確定の後に幅員と出どころを変えると、確定のまとめにも反映される', () => {
    useConfirmedSite.getState().confirm(SITE)
    useConfirmedSite.getState().setRoadWidth('8000')
    useConfirmedSite.getState().setRoadSource('資料指定')
    expect(useConfirmedSite.getState().roadWidth).toBe('8000')
    expect(useConfirmedSite.getState().confirmed).toMatchObject({ roadWidthMm: 8000, roadSource: '資料指定' })
  })

  it('RW3: 確定していなければ、店舗の値だけが変わり、確定のまとめは null のまま', () => {
    useConfirmedSite.getState().setRoadWidth('7000')
    expect(useConfirmedSite.getState().roadWidth).toBe('7000')
    expect(useConfirmedSite.getState().confirmed).toBeNull()
  })
})
