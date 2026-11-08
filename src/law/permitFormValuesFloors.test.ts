// 仕様（統括の依頼 2026-11-06。8: 各階の床面積）: FL1: 各階の床面積は、階ごとの値（F2-4-12.階別N。N は階の番号）で入る。出典はボリューム（同じ形の箱なので、各階は建築面積）。
import { describe, expect, it } from 'vitest'
import { formValuesFromVolume } from './permitFormValues'
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

describe('各階の床面積の値（仕様 FL1）', () => {
  it('FL1: 5 階なら、階 1〜5 の値（20m×20m → 400.00 ㎡）がボリュームの出典で入る', () => {
    const v = formValuesFromVolume(block(5), { structure: 'RC' })
    for (let f = 1; f <= 5; f++) expect(v[`F2-4-12.階別${f}`]).toEqual({ value: '400.00', from: 'ボリューム' })
    expect(v['F2-4-12.階別6']).toBeUndefined()
  })
})
