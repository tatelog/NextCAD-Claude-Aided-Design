// 仕様（統括の依頼 2026-11-06。第三号の記入: 第二号と同じ値の元・同じ書き方の規則で埋める。新しい値の元は作らない）:
// T3P1: 地名地番（1 欄・見出しの後ろ）は、見出しの後ろに入る。
// T3P2: 防火地域（4 欄・見出しと同じ段落の □）は、選んだ語の □ を ■ にする。
// T3P3: 道路の幅員・接する長さは、細目（【イ.幅員】【ロ.…】）の後ろに入る（第三号は単位が印刷されていない）。
// T3P4: 敷地面積（イ）は、細目の段落の 1 番目の括弧（列 1）。用途地域等（ロ）も同じ列 1。
// T3P5: 建築面積・延べ面積は、【イ.建築物全体】の 1 番目（申請部分）と 3 番目（合計）に同じ値。
// T3P6: 件数は、細目【イ.申請に係る建築物の数】の後ろ。
// T3P7: 高さ・階数は、細目の段落の 1 番目の括弧（申請に係る建築物）。
// T3P8: 構造は、細目【ハ.構造】の「造」の前。
// 段落は、東京都の第三号の第二面（実際の段落の並びを写した形）。
import { describe, expect, it } from 'vitest'
import permitFormsJson from './permitForms.json'
import type { FormDef } from './permitFormPlan'
import { fillInstructionsOf } from './permitFormFill'

const DEFS = (permitFormsJson as unknown as { forms: FormDef[] }).forms
const F3 = DEFS.find((d) => d.id === 'F3')!

const PARAGRAPHS = [
  '建築計画概要書（第二面）',
  '   建築物及びその敷地に関する事項',
  '【1.地名地番】',
  '【2.住居表示】',
  '【3.都市計画区域及び準都市計画区域の内外の別等】',
  '【4.防火地域】      □防火地域      □準防火地域      □指定なし',
  '【5.その他の区域、地域、地区又は街区】',
  '【6.道路】',
  '　  【イ.幅員】',
  '　  【ロ.敷地と接している部分の長さ】',
  '【7.敷地面積】',
  '　  【イ.敷地面積】    (1)(            )(            )(            )(            )',
  '　                     (2)(            )(            )(            )(            )',
  '　  【ロ.用途地域等】     (            )(            )(            )(            )',
  '　  【ハ.建築基準法第52条第１項及び第２項の規定による建築物の容積率】',
  '【8.主要用途】 (区分        )',
  '【9.工事種別】',
  '【10.建築面積】　            (申請部分        )(申請以外の部分 )(合計           )',
  '【イ.建築物全体】       (                )(               )(               )',
  '【11.延べ面積】　  (申請部分        )(申請以外の部分 )(合計           )',
  '　  【イ.建築物全体】        (                )(               )(               )',
  '【12.建築物の数】',
  '　  【イ.申請に係る建築物の数】',
  '　  【ロ.同一敷地内の他の建築物の数】',
  '【13.建築物の高さ等】　      (申請に係る建築物)(他の建築物    )',
  '　  【イ.最高の高さ】        (               )(               )',
  '　  【ロ.階数】         地上 (               )(               )',
  ' 　 【ハ.構造】                        造      一部                  造',
  '【14.許可・認定等】',
]

const v = (value: string) => ({ value, from: '案件' as const })
const at = (fieldId: string) => (fillInstructionsOf(F3, PARAGRAPHS, {
  'F3-2-01': v('江東区新砂二丁目625番1'),
  'F3-2-04': v('防火地域'),
  'F3-2-06.幅員': v('6.00ｍ'),
  'F3-2-06.敷地と接している部分の長さ': v('3.62ｍ'),
  'F3-2-07.敷地面積': v('1200.00'),
  'F3-2-07.用途地域等': v('準工業地域'),
  'F3-2-10': v('400.00'),
  'F3-2-11': v('2000.00'),
  'F3-2-12': v('1'),
  'F3-2-13.最高の高さ': v('16.00'),
  'F3-2-13.階数（地上）': v('5'),
  'F3-2-13.構造': v('鉄筋コンクリート'),
}).instructions.filter((i) => i.fieldId === fieldId))

describe('第三号の記入（仕様 T3P1〜T3P8）', () => {
  it('T3P1: 地名地番は、見出しの後ろに入る', () => {
    expect(at('F3-2-01')).toMatchObject([{ paragraphIndex: 2, kind: 'after', heading: '【1.地名地番】', value: '江東区新砂二丁目625番1' }])
  })

  it('T3P2: 防火地域は、見出しと同じ段落の □防火地域 を ■ にする指示になる', () => {
    expect(at('F3-2-04')).toMatchObject([{ paragraphIndex: 5, kind: 'check', value: '防火地域' }])
  })

  it('T3P3: 幅員と接する長さは、細目の後ろに入る', () => {
    expect(at('F3-2-06.幅員')).toMatchObject([{ paragraphIndex: 8, kind: 'after', heading: '【イ.幅員】', value: '6.00ｍ' }])
    expect(at('F3-2-06.敷地と接している部分の長さ')).toMatchObject([{ paragraphIndex: 9, kind: 'after', value: '3.62ｍ' }])
  })

  it('T3P4: 敷地面積（イ）と用途地域等（ロ）は、細目の段落の 1 番目の括弧（列 1）', () => {
    expect(at('F3-2-07.敷地面積')).toMatchObject([{ paragraphIndex: 11, kind: 'blanks', bracket: 0, value: '1200.00' }])
    expect(at('F3-2-07.用途地域等')).toMatchObject([{ paragraphIndex: 13, kind: 'blanks', bracket: 0, value: '準工業地域' }])
  })

  it('T3P5: 建築面積と延べ面積は、【イ.建築物全体】の 1 番目（申請部分）と 3 番目（合計）', () => {
    expect(at('F3-2-10').map((i) => [i.paragraphIndex, i.bracket, i.value])).toEqual([
      [18, 0, '400.00'],
      [18, 2, '400.00'],
    ])
    expect(at('F3-2-11').map((i) => [i.paragraphIndex, i.bracket, i.value])).toEqual([
      [20, 0, '2000.00'],
      [20, 2, '2000.00'],
    ])
  })

  it('T3P6: 件数は、【イ.申請に係る建築物の数】の後ろ', () => {
    expect(at('F3-2-12')).toMatchObject([{ paragraphIndex: 22, kind: 'after', heading: '【イ.申請に係る建築物の数】', value: '1' }])
  })

  it('T3P7: 高さと階数は、細目の段落の 1 番目の括弧（申請に係る建築物）', () => {
    expect(at('F3-2-13.最高の高さ')).toMatchObject([{ paragraphIndex: 25, kind: 'blanks', bracket: 0, value: '16.00' }])
    expect(at('F3-2-13.階数（地上）')).toMatchObject([{ paragraphIndex: 26, kind: 'blanks', bracket: 0, value: '5' }])
  })

  it('T3P8: 構造は、【ハ.構造】の「造」の前', () => {
    expect(at('F3-2-13.構造')).toMatchObject([{ paragraphIndex: 27, kind: 'beforeUnit', unit: '造', value: '鉄筋コンクリート' }])
  })
})
