// 仕様（統括の依頼 2026-11-06。容積率・建蔽率は、敷地で取った用途地域（都市計画決定情報・PLATEAU）の値。出典は「都市計画決定情報（PLATEAU）」）:
// LV1: 地点の用途地域が一つのときだけ、その容積率・建蔽率の値を取る。二つ以上・無いときは取らない（null）。値が null の項目は、その欄を入れない。
// LV2: 値は、第二号と第三号の 7 欄（ハ・ニ）に入る。出典は「都市計画決定情報（PLATEAU）」。値は「200％」「60％」（全角の％。統括の答え 2026-11-06。数字だけだと単位が読み取れないため）。
// LV3: 出典の文と、値が無いときの理由は、一か所に決まっている（空欄の一覧に出す）。
import { describe, expect, it } from 'vitest'
import { formValuesFromVolume, LIMIT_SOURCE, limitNotesOf, zoneLimitsOf } from './permitFormValues'
import { extrudeVolume } from '../volume/extrude'

const block = extrudeVolume({
  footprint: [
    { x: 0, y: 0 },
    { x: 20_000, y: 0 },
    { x: 20_000, y: 20_000 },
    { x: 0, y: 20_000 },
  ],
  storey_count: 5,
  storey_height: 3_200,
})

describe('容積率・建蔽率の値（仕様 LV1）', () => {
  it('LV1: 用途地域が一つなら、その容積率・建蔽率', () => {
    expect(zoneLimitsOf([{ floorAreaRatePercent: 200, buildingCoverageRatePercent: 60 }])).toEqual({
      floorAreaRatePercent: 200,
      buildingCoverageRatePercent: 60,
    })
  })

  it('LV1: 二つ以上・無いときは決めない（null）。値が無い項目は null のまま', () => {
    expect(zoneLimitsOf([{ floorAreaRatePercent: 200, buildingCoverageRatePercent: 60 }, { floorAreaRatePercent: 300, buildingCoverageRatePercent: 60 }])).toBeNull()
    expect(zoneLimitsOf([])).toBeNull()
    expect(zoneLimitsOf([{ floorAreaRatePercent: null, buildingCoverageRatePercent: 60 }])).toEqual({
      floorAreaRatePercent: null,
      buildingCoverageRatePercent: 60,
    })
  })
})

describe('容積率・建蔽率の欄（仕様 LV2・LV3）', () => {
  it('LV2: 第二号と第三号の 7 欄のハ・ニに、同じ値（出典は都市計画決定情報（PLATEAU））', () => {
    const v = formValuesFromVolume(block, { structure: 'RC', limits: { floorAreaRatePercent: 200, buildingCoverageRatePercent: 60 } })
    expect(v['F2-3-07.容積率']).toEqual({ value: '200％', from: '都市計画決定情報（PLATEAU）' })
    expect(v['F3-2-07.容積率']).toEqual({ value: '200％', from: '都市計画決定情報（PLATEAU）' })
    expect(v['F2-3-07.建蔽率']).toEqual({ value: '60％', from: '都市計画決定情報（PLATEAU）' })
    expect(v['F3-2-07.建蔽率']).toEqual({ value: '60％', from: '都市計画決定情報（PLATEAU）' })
  })

  it('LV2: 容積率が null なら容積率の欄は入らず、建蔽率は入る', () => {
    const v = formValuesFromVolume(block, { structure: 'RC', limits: { floorAreaRatePercent: null, buildingCoverageRatePercent: 60 } })
    expect(v['F2-3-07.容積率']).toBeUndefined()
    expect(v['F2-3-07.建蔽率']?.value).toBe('60％')
  })

  it('LV3: 出典の文は一か所。値が無いときの理由は、空欄の一覧に出す', () => {
    expect(LIMIT_SOURCE).toBe('都市計画決定情報（PLATEAU）')
    expect(limitNotesOf(null)).toEqual(['容積率・建蔽率：地点の用途地域が一つでないので、都市計画決定情報の値は決めない（空欄）'])
    expect(limitNotesOf({ floorAreaRatePercent: null, buildingCoverageRatePercent: 60 })).toEqual(['容積率：都市計画決定情報の値が無い（空欄）'])
    expect(limitNotesOf({ floorAreaRatePercent: 200, buildingCoverageRatePercent: 60 })).toEqual([])
  })
})
