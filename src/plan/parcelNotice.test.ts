// 仕様（統括の依頼 2026-11-06。2: P1 の「前面道路の幅員」の下の仮置きの文言を、選んだ筆に合わせる）:
// 仕様 2a: 選んだ筆があるときは、「筆界は選んだ筆（敷地で選んだ公図）。登記情報は使わない（約款未確認）」。
// 仕様 2b: 筆が無いとき（ダミー）は、今までどおりの仮置きの文言。
import { describe, expect, it } from 'vitest'
import type { Point } from '../geom/viewport'
import { parcelNoticeOf } from './lot'

const SQUARE: Point[] = [
  { x: 0, y: 0 },
  { x: 10_000, y: 0 },
  { x: 10_000, y: 10_000 },
  { x: 0, y: 10_000 },
]

describe('筆界の注記（仕様 2a・2b）', () => {
  it('仕様 2a: 選んだ筆があるときは、選んだ筆の注記', () => {
    expect(parcelNoticeOf(SQUARE)).toBe('筆界は選んだ筆（敷地で選んだ公図）。登記情報は使わない（約款未確認）')
  })

  it('仕様 2b: 筆が無いとき（ダミー）は、今までどおりの仮置きの文言', () => {
    expect(parcelNoticeOf(null)).toBe(
      '仮置き: 筆界はダミー（20 m × 30 m）。登記情報は使わない（約款未確認）。',
    )
  })
})
