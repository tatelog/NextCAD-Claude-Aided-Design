// 仕様（統括の依頼 2026-11-06。幅員と出どころを確定のまとめに入れる）:
// RL1: 幅員（mm）と出どころを入れた保存は、読むと元に戻る。
// RL2: 幅員と出どころの無い古い確定データは、幅員 6000 mm・出どころ「数値指定」（既定）として読める。
import { describe, expect, it } from 'vitest'
import { parseSaveData } from './loadData'
import { buildSaveData } from './saveData'

const CONF = { parcelUid: null, lot: null, frame: null, center: { lat: 35.6, lon: 139.8 }, roadEdge: 1 }
const BASE = { projectName: 'x', entries: [], storeyCount: 5, storeyHeightMm: 3000, savedAt: new Date('2026-11-01T00:00:00.000Z') }
const roundTrip = (input: Parameters<typeof buildSaveData>[0]): unknown => JSON.parse(JSON.stringify(buildSaveData(input)))

describe('前面道路の幅員と出どころの保存（仕様 RL1・RL2）', () => {
  it('RL1: 幅員と出どころを入れた保存は、読むと元に戻る', () => {
    const json = roundTrip({ ...BASE, confirmedSite: { ...CONF, roadWidthMm: 8000, roadSource: '対岸指定' } })
    const loaded = parseSaveData(json)
    expect(loaded.confirmedSite).toMatchObject({ roadWidthMm: 8000, roadSource: '対岸指定' })
  })

  it('RL2: 幅員と出どころの無い古い確定データは、6000 mm・数値指定として読める', () => {
    const old = roundTrip({ ...BASE, confirmedSite: CONF } as unknown as Parameters<typeof buildSaveData>[0])
    const loaded = parseSaveData(old)
    expect(loaded.confirmedSite).toMatchObject({ roadWidthMm: 6000, roadSource: '数値指定' })
  })
})
