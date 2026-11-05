// 仕様（統括の依頼 2026-11-06。5: 郵便番号の欄は、見た目は灰色で押せるまま。押すと下の文を出す）:
// 仕様 5-1: 押したときに出す文は、指定の文と一字一句同じ。
// 仕様 5-2: 文は、住所か地図のクリックで敷地を選ぶよう案内する。
// 仕様 5-3: 開発の注記の言葉（対象外・未決・ハッカソン）を含まない。
import { describe, expect, it } from 'vitest'
import { POSTAL_UNAVAILABLE_NOTICE } from './postalNotice'

describe('郵便番号の欄を押したときの文（仕様 5-1〜5-3）', () => {
  it('仕様 5-1: 押したときの文は、指定の文と一字一句同じ', () => {
    expect(POSTAL_UNAVAILABLE_NOTICE).toBe(
      '郵便番号から住所を引くデータの利用条件が確認できていないため、今回は使えません。住所か地図のクリックで敷地を選んでください。',
    )
  })

  it('仕様 5-2: 住所か地図のクリックで敷地を選ぶよう案内する', () => {
    expect(POSTAL_UNAVAILABLE_NOTICE).toContain('住所か地図のクリックで敷地を選んでください。')
  })

  it('仕様 5-3: 開発の注記の言葉（対象外・未決・ハッカソン）を含まない', () => {
    expect(POSTAL_UNAVAILABLE_NOTICE).not.toContain('対象外')
    expect(POSTAL_UNAVAILABLE_NOTICE).not.toContain('未決')
    expect(POSTAL_UNAVAILABLE_NOTICE).not.toContain('ハッカソン')
  })
})
