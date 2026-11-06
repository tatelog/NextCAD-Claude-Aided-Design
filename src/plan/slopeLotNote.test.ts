// 仕様（統括の依頼 2026-11-06。ボリュームの欄の斜線の注記）: 注記に出す敷地は、いま使っている敷地と同じ元から作る（ダミーの文言を固定しない）。
// 仕様 SN1: 筆が無い（ダミーの筆界）ときは、「筆界（ダミー 20 m × 30 m）に当てて切る」。
// 仕様 SN2: 選んだ筆があり、地番が取れるときは、「選んだ筆（地番 625-1）に当てて切る」。ダミーの文言は出さない。
// 仕様 SN3: 選んだ筆があるが地番が取れないときは、「選んだ筆（地番不明）に当てて切る」。
// 仕様 SN4: どの場合も、法定の値（建築基準法 第56条・別表第三）の文を先頭に出す。
import { describe, expect, it } from 'vitest'
import { slopeLotNoteOf } from './lot'

const SQUARE = [
  { x: 0, y: 0 },
  { x: 20_000, y: 0 },
  { x: 20_000, y: 30_000 },
  { x: 0, y: 30_000 },
]

describe('斜線の注記の敷地（仕様 SN1〜SN4）', () => {
  it('仕様 SN1: 筆が無いときは、ダミーの筆界に当てて切る', () => {
    const note = slopeLotNoteOf(null, null)
    expect(note).toContain('筆界（ダミー 20 m × 30 m）に当てて切る')
    expect(note).toContain('建築基準法 第56条・別表第三')
  })

  it('仕様 SN2: 選んだ筆と地番があるときは、その地番を出し、ダミーの文言は出さない', () => {
    const note = slopeLotNoteOf(SQUARE, '625-1')
    expect(note).toContain('選んだ筆（地番 625-1）に当てて切る')
    expect(note).not.toContain('ダミー')
  })

  it('仕様 SN3: 選んだ筆はあるが地番が取れないときは、「地番不明」と出す', () => {
    const note = slopeLotNoteOf(SQUARE, null)
    expect(note).toContain('選んだ筆（地番不明）に当てて切る')
    expect(note).not.toContain('ダミー')
  })

  it('仕様 SN4: 法定の値の文は、どの場合も先頭に出る', () => {
    for (const [parcel, chiban] of [[null, null], [SQUARE, '625-1'], [SQUARE, null]] as const) {
      expect(slopeLotNoteOf(parcel, chiban).startsWith('斜線は法定の値（建築基準法 第56条・別表第三）を')).toBe(true)
    }
  })
})
