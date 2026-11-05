// 仕様（統括の依頼 2026-11-06。3: 日射・日影の計算に、江東区の固定点ではなく、確定した敷地の緯度経度を使う）:
// 仕様 3a: 確定した敷地の中心の緯度経度を、日射・日影の地点にする。
// 仕様 3b: 確定していないときは、今までどおりの固定の地点（35.67, 139.86）を使う。
import { describe, expect, it } from 'vitest'
import { sunSiteOf } from './sunSite'

describe('日射・日影の地点（仕様 3a・3b）', () => {
  it('仕様 3a: 確定した敷地の中心の緯度経度を使う', () => {
    expect(sunSiteOf({ lat: 35.667125, lon: 139.829867 })).toEqual({ lat: 35.667125, lon: 139.829867 })
  })

  it('仕様 3b: 確定していないときは、今までどおりの固定の地点', () => {
    expect(sunSiteOf(null)).toEqual({ lat: 35.67, lon: 139.86 })
  })
})
