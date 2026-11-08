// 仕様（統括の決定 2026-11-06。第五面の枚数は B）: 5〜8 欄の内容が同じ階を 1 枚にまとめ、2 欄に階を列記する（「1階〜5階」。続かない階は「1階、3階」）。
// 最初のまとまり（最も下の階を含むもの）だけを書き、残りの階のまとまりは「第五面は階ごとに別紙（内容の違う階: ○階〜○階）」と空欄の一覧に出す。
// FS1: 階の列記: 続く階は「○階〜○階」、続かない階は「、」で並べる。
// FS2: 全階の床面積が同じなら、1 枚（最初のまとまりが全階）。残りは無い。
// FS3: 途中の階だけ違うなら、最初のまとまりと残りに分ける（残りは階の列記つき）。
// FS4: 階が無ければ、まとまりは無い。
// FS5: 第五面の未決の一行（用途の区分の記号は人が入れる）と、別紙の一行は、一か所に決まっている。
// FS6: 階の数だけ、2 欄に「1階〜N階」が入る（箱の形なら 1 枚）。
import { describe, expect, it } from 'vitest'
import { floorsLabelOf, floorSheetOf, floorSheetRestNoteOf } from './floorSheet'
import { FIFTH_OPEN_NOTE, formValuesFromVolume } from './permitFormValues'
import { extrudeVolume } from '../volume/extrude'

const areas = (list: [number, string][]) => list.map(([floor, area]) => ({ floor, area }))

describe('階の列記（仕様 FS1）', () => {
  it('FS1: 続く階は「○階〜○階」、続かない階は「、」で並ぶ', () => {
    expect(floorsLabelOf([1, 2, 3, 4, 5])).toBe('1階〜5階')
    expect(floorsLabelOf([1, 3])).toBe('1階、3階')
    expect(floorsLabelOf([1, 3, 4, 5])).toBe('1階、3階〜5階')
    expect(floorsLabelOf([1])).toBe('1階')
  })
})

describe('まとまり（仕様 FS2・FS3・FS4）', () => {
  it('FS2: 全階が同じ床面積なら、1 枚（残りは無い）', () => {
    const s = floorSheetOf(areas([[1, '400.00'], [2, '400.00'], [3, '400.00'], [4, '400.00'], [5, '400.00']]))
    expect(s.first).toEqual({ floors: [1, 2, 3, 4, 5], area: '400.00', label: '1階〜5階' })
    expect(s.rest).toEqual([])
  })

  it('FS3: 途中の階だけ違うなら、最初のまとまり（下の階）と残りに分ける', () => {
    const s = floorSheetOf(areas([[1, '500.00'], [2, '500.00'], [3, '400.00'], [4, '400.00'], [5, '400.00']]))
    expect(s.first).toEqual({ floors: [1, 2], area: '500.00', label: '1階〜2階' })
    expect(s.rest).toEqual([{ floors: [3, 4, 5], label: '3階〜5階' }])
  })

  it('FS4: 階が無ければ、まとまりは無い', () => {
    expect(floorSheetOf([])).toEqual({ first: null, rest: [] })
  })
})

describe('残りの階の別紙（仕様 FS5）', () => {
  it('FS5: 残りの階は「第五面は階ごとに別紙（内容の違う階: …）」の一行', () => {
    expect(floorSheetRestNoteOf([{ floors: [3, 4, 5], label: '3階〜5階' }])).toBe('第五面は階ごとに別紙（内容の違う階: 3階〜5階）')
  })

  it('FS5: 用途の区分の記号の未決の一行は、人が入れる、の文に決まっている', () => {
    expect(FIFTH_OPEN_NOTE).toBe('第五面：用途の区分の記号は人が入れる（様式の注の別紙の表に従う。表はアプリに無い）')
  })
})

describe('箱の形の値（仕様 FS6）', () => {
  const block = (storeys: number) =>
    extrudeVolume({
      footprint: [
        { x: 0, y: 0 },
        { x: 20_000, y: 0 },
        { x: 20_000, y: 20_000 },
        { x: 0, y: 20_000 },
      ],
      storey_count: storeys,
      storey_height: 3_200,
    })

  it('FS6: 5 階の箱は、2 欄に「1階〜5階」（ボリュームの出典）', () => {
    expect(formValuesFromVolume(block(5), { structure: 'RC' })['F2-5-02']).toEqual({ value: '1階〜5階', from: 'ボリューム' })
  })

  it('FS6: 1 階の箱は「1階」', () => {
    expect(formValuesFromVolume(block(1), { structure: 'RC' })['F2-5-02']).toEqual({ value: '1階', from: 'ボリューム' })
  })
})
