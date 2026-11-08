// 仕様（統括の依頼 2026-11-06。2 件目: 読み込み時の地点を、デモの筆の中の点に置く）:
// 仕様 36: 読み込み時の地点は、区役所の地点（東京都江東区東陽 4-11-28）とは別の点。区役所の住所は入力欄の例（placeholder）に残す。
// 仕様 37: 読み込み時の地点は、江東区の範囲内の経緯度。
// 注: 「デモの筆の中にある」は、筆の形（公開の登記情報）をリポジトリに持たないため、試験ではなく実データでの確認で見る。
//     確認の結果は initialView.ts の DEMO_SITE のそばに書いてある。
import { describe, expect, it } from 'vitest'
import { DEMO_SITE } from './initialView'

describe('読み込み時の地点（仕様 36・37）', () => {
  it('仕様 36: 区役所の地点とは別の点', () => {
    expect(DEMO_SITE).toBeDefined()
    expect(DEMO_SITE).not.toEqual({ lon: 139.81636, lat: 35.672993 })
  })

  it('仕様 37: 江東区の範囲内の経緯度', () => {
    expect(DEMO_SITE.lon).toBeGreaterThan(139.7)
    expect(DEMO_SITE.lon).toBeLessThan(139.9)
    expect(DEMO_SITE.lat).toBeGreaterThan(35.6)
    expect(DEMO_SITE.lat).toBeLessThan(35.75)
  })
})
