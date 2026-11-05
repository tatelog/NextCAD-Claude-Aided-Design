// 仕様（統括の依頼 2026-11-06。8: 確定した敷地を、保存に含める。読み込み直すと P2 がダミーに戻らない）:
// 仕様 8a: 確定していれば、保存のデータに確定した敷地が入る。確定していなければ、項目ごと付けない（今までの形）。
// 仕様 8b: 保存を読むと、確定した敷地が戻る。確定の項目が無い古い保存は、確定していない状態になる。
// 仕様 8c: 読み込むと、確定の店舗に確定した敷地が入り、今いる地点も確定の中心になる（P2 がダミーに戻らない）。
// 注: 周辺建物と用途地域は保存に入れない（ファイルが大きくなるため）。読み込みのあと、取り直す。
import { beforeEach, describe, expect, it } from 'vitest'
import { applyLoadedProject, parseSaveData } from './loadData'
import { buildSaveData } from './saveData'
import { useConfirmedSite, type ConfirmedSite } from '../store/confirmedSite'

const CONFIRMED: ConfirmedSite = {
  parcelUid: '筆X',
  lot: [
    { x: 0, y: 0 },
    { x: 10_000, y: 0 },
    { x: 10_000, y: 10_000 },
    { x: 0, y: 10_000 },
  ],
  frame: { lon0: 139.83, lat0: 35.67, kx: 90_000, ky: 111_000, cx: 5_000, cy: 5_000 },
  center: { lat: 35.67, lon: 139.83 },
  roadEdge: 2,
}
const base = { projectName: '案件', entries: [], storeyCount: 5, storeyHeightMm: 3000, savedAt: new Date('2026-11-06T00:00:00Z') }
const roundTrip = (d: unknown) => JSON.parse(JSON.stringify(d))

beforeEach(() => useConfirmedSite.setState({ confirmed: null, currentSite: null, roadEdge: 0 }))

describe('確定した敷地の保存と読み込み（仕様 8a〜8c）', () => {
  it('仕様 8a: 確定していれば保存に入り、していなければ項目ごと付けない', () => {
    expect(buildSaveData({ ...base, confirmedSite: CONFIRMED }).confirmedSite).toEqual(CONFIRMED)
    expect('confirmedSite' in buildSaveData(base)).toBe(false)
  })

  it('仕様 8b: 読むと確定した敷地が戻る。確定の項目が無い古い保存は、確定していない', () => {
    expect(parseSaveData(roundTrip(buildSaveData({ ...base, confirmedSite: CONFIRMED }))).confirmedSite).toEqual(CONFIRMED)
    expect(parseSaveData(roundTrip(buildSaveData(base))).confirmedSite).toBeNull()
  })

  it('仕様 8c: 読み込むと、確定の店舗に確定した敷地が入り、今いる地点も確定の中心になる', () => {
    applyLoadedProject(parseSaveData(roundTrip(buildSaveData({ ...base, confirmedSite: CONFIRMED }))))
    const s = useConfirmedSite.getState()
    expect(s.confirmed).toEqual(CONFIRMED)
    expect(s.currentSite).toEqual(CONFIRMED.center)
    expect(s.roadEdge).toBe(2)
  })
})
