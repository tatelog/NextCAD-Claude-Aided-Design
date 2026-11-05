// 仕様（統括の依頼 2026-11-05。G20・G22。出典の無い単価には未確定（provisional）の印を付ける）:
// 仕様 1（印）: 既定の単価表の行は、出典が無いので、未確定の印（provisional = true）が付く。
// 仕様 2（出典の欄）: 既定の行の出典の欄は、出典があるように見える「利用者入力」を入れない。
import { describe, expect, it } from 'vitest'
import { parsePriceCsv } from '../estimate/priceCsv'
import { PRICE_CSV_SAMPLE } from './priceTable'

describe('既定の単価表（仕様 1・2）', () => {
  const rows = parsePriceCsv(PRICE_CSV_SAMPLE)

  it('仕様 1: どの行にも未確定の印（provisional）が付く', () => {
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) expect(r.provisional).toBe(true)
  })

  it('仕様 2: 出典の欄は「利用者入力」を入れない（出典なしと分かる）', () => {
    for (const r of rows) expect(String(r.source_ref)).not.toContain('利用者入力')
  })
})
