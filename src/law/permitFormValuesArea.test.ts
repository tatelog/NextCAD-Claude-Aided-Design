// 仕様（統括の依頼 2026-11-06。2・3: 地名地番と敷地面積。出典は筆のデータ（公図）。敷地面積は参考値）:
// FV1: 地名地番は、筆の属性から作った文が、出典「公図」で F2-3-01 に入る。
// FV2: 敷地面積は、筆の面積（参考値）で、F2-3-07.敷地面積（イ）と F2-3-07.敷地面積の合計（ホ）に入る。出典は「公図の参考値」。
// FV3: 筆の面積は、筆の平面（mm）から ㎡ で出す（20 m × 20 m → 400 ㎡）。筆が無いときは出さない。
// FV4: 参考値の文は一か所に決める（ビューアと空欄の一覧で同じ文）。
import { describe, expect, it } from 'vitest'
import { AREA_REFERENCE_NOTE, formValuesFromVolume, siteAreaM2Of } from './permitFormValues'
import { extrudeVolume } from '../volume/extrude'

function block(storeys: number) {
  return extrudeVolume({
    footprint: [
      { x: 0, y: 0 },
      { x: 20_000, y: 0 },
      { x: 20_000, y: 20_000 },
      { x: 0, y: 20_000 },
    ],
    storey_count: storeys,
    storey_height: 3_200,
  })
}

describe('地名地番と敷地面積（仕様 FV1〜FV4）', () => {
  it('FV1: 地名地番は、出典「公図」で F2-3-01 に入る', () => {
    const v = formValuesFromVolume(block(5), { structure: 'RC', chiban: '江東区新砂二丁目625番1' })
    expect(v['F2-3-01']).toEqual({ value: '江東区新砂二丁目625番1', from: '公図' })
  })

  it('FV2: 敷地面積（参考値）は、イ（F2-3-07.敷地面積）とホ（F2-3-07.敷地面積の合計）に、出典「公図の参考値」で入る', () => {
    const v = formValuesFromVolume(block(5), { structure: 'RC', siteAreaM2: 1_200 })
    expect(v['F2-3-07.敷地面積']).toEqual({ value: '1200.00', from: '公図の参考値' })
    expect(v['F2-3-07.敷地面積の合計']).toEqual({ value: '1200.00', from: '公図の参考値' })
  })

  it('FV2: 地名地番と敷地面積が無いときは、その欄は入らない', () => {
    const v = formValuesFromVolume(block(5), { structure: 'RC' })
    expect(v['F2-3-01']).toBeUndefined()
    expect(v['F2-3-07.敷地面積の合計']).toBeUndefined()
  })

  it('FV3: 筆の面積は ㎡（20 m × 20 m → 400 ㎡）。筆が無いときは undefined', () => {
    expect(siteAreaM2Of([
      { x: 0, y: 0 },
      { x: 20_000, y: 0 },
      { x: 20_000, y: 20_000 },
      { x: 0, y: 20_000 },
    ])).toBeCloseTo(400, 6)
    expect(siteAreaM2Of(null)).toBeUndefined()
  })

  it('FV4: 参考値の文は一か所（AREA_REFERENCE_NOTE）', () => {
    expect(AREA_REFERENCE_NOTE).toBe('敷地面積は公図からの参考値。測量の値で直す')
  })
})
