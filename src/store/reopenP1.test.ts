// 仕様（統括の依頼 2026-11-06。1: 確定のあと P1 を開き直しただけで「確定し直しが要る」が出ない）:
// 仕様 1a: P1 を開き直すとき、地点は店舗の今いる地点から始める（既定の地点に戻さない）。今いる地点が無ければ既定の地点。
// 仕様 1b: 地図の読み込みで、筆が既に選ばれていれば、その筆を残す（デモの筆で上書きしない）。
// 仕様 1c: まだ筆が選ばれていなければ、デモの筆を選ぶ（今までどおり）。
// 仕様 1d: 確定のあと P1 を開き直しても、地点と筆は確定のときのまま（確定し直しは要らない）。
import { describe, expect, it } from 'vitest'
import { parcelOnLoadOf } from '../map/parcelOnLoad'
import { isConfirmedStaleOf, startSiteOf, useConfirmedSite, type ConfirmedSite } from './confirmedSite'

const DEMO_UID = '10121_hosei_20121129083849|H000000013'
const DEFAULT = { lat: 35.667125, lon: 139.829867 }
const CENTER_625 = { lat: 35.6712, lon: 139.8198 }

describe('P1 を開き直すときの地点（仕様 1a）', () => {
  it('今いる地点があれば、そこから始める。無ければ既定の地点', () => {
    expect(startSiteOf(CENTER_625, DEFAULT)).toEqual(CENTER_625)
    expect(startSiteOf(null, DEFAULT)).toEqual(DEFAULT)
  })
})

describe('地図の読み込みで選ぶ筆（仕様 1b・1c）', () => {
  it('筆が既に選ばれていれば、その筆を残す。まだ無ければデモの筆', () => {
    expect(parcelOnLoadOf('10121_xxx|625-1', DEMO_UID)).toBe('10121_xxx|625-1')
    expect(parcelOnLoadOf(null, DEMO_UID)).toBe(DEMO_UID)
  })
})

describe('開き直しで確定し直しにならない（仕様 1d）', () => {
  it('確定のあと開き直しても、地点と筆は確定のときのまま', () => {
    const confirmed: ConfirmedSite = {
      parcelUid: '10121_xxx|625-1',
      lot: null,
      frame: null,
      center: CENTER_625,
      roadEdge: 0,
    }
    useConfirmedSite.getState().confirm(confirmed)
    // P1 を開き直す: 地点は店舗の今いる地点から、筆は選ばれていた筆を残す
    const site = startSiteOf(useConfirmedSite.getState().currentSite, DEFAULT)
    const uid = parcelOnLoadOf(confirmed.parcelUid, DEMO_UID)
    expect(isConfirmedStaleOf(useConfirmedSite.getState().confirmed, uid, site)).toBe(false)
  })
})
