// 仕様（統括の依頼 2026-11-06。2-b: 取り込んだ様式の中身と、アプリが欄に入れるつもりの値を並べる。AI は使わず決定論）:
// PL1: 見出しは、その面の中だけで探す（別の面に同じ見出しがあっても、この面では見つからない）。
// PL2: 見出しは段落の先頭一致（「【4.防火地域】 □防火地域」に「【4.防火地域】」が合う）。
// PL3: 同じ面に同じ見出しが複数あるとき、occurrence 番目を探す。
// PL4: 細目は、親の見出しの段落を含めて、親の後ろを探す（「【6.昇降機の概要】（番号　）」の中の細目も見つかる）。
// PL5: 欄ごとの行動: 「行政」と書かれた欄は書かない／値がある欄は入れる／それ以外は人が入れる／見出しが無ければ見つからない／版に無ければ版に無い。
// PL6: 細目の値は「欄の id ＋ . ＋ 細目の名前」（【ｲ.最高の高さ】→「最高の高さ」）で探し、括弧などの表記は両方そろえて比べる。
import { describe, expect, it } from 'vitest'
import { locateHeadingOf, planRowsOf, subLabelOf, type FormDef } from './permitFormPlan'

const FORM: FormDef = {
  id: 'T',
  name: 'テスト様式',
  faces: [
    {
      no: 1,
      title: '第一面',
      fields: [
        { id: 'T-1-01', label: '番号', tokyo: { face: '（第一面）', heading: '【1.番号】', in: 'paragraph', place: 'afterHeading' } },
        { id: 'T-1-02', label: '防火', tokyo: { face: '（第一面）', heading: '【4.防火地域】', in: 'paragraph', place: 'checkbox' } },
        { id: 'T-1-03', label: '行政欄', tokyo: { face: '（第一面）', heading: '【7.受付】', in: 'tableCell', place: 'cellBelow', note: '行政が記入' } },
        { id: 'T-1-04', label: '版に無い', tokyo: { face: '（第一面）', heading: '【9.無し】', in: 'paragraph', place: 'afterHeading', absent: true } },
        { id: 'T-1-05', label: '見つからない', tokyo: { face: '（第一面）', heading: '【99.無い】', in: 'paragraph', place: 'afterHeading' } },
      ],
    },
    {
      no: 2,
      title: '第二面',
      fields: [
        { id: 'T-2-01', label: '番号', tokyo: { face: '（第二面）', heading: '【1.番号】', in: 'paragraph', place: 'afterHeading' } },
        {
          id: 'T-2-02',
          label: '昇降機',
          tokyo: {
            face: '（第二面）',
            heading: '【6.昇降機の概要】',
            in: 'paragraph',
            place: 'afterHeading',
            subitems: [
              { heading: '【6.昇降機の概要】', place: 'fillBlanks' },
              { heading: '【ｲ.最高の高さ】', place: 'afterHeading' },
            ],
          },
        },
      ],
    },
  ],
}

const PARAGRAPHS = [
  '（第一面）',
  '【1.番号】　　',
  '【4.防火地域】 □防火地域 □準防火地域',
  '【7.受付】',
  '（第二面）',
  '【1.番号】　　',
  '【6.昇降機の概要】（番号　）',
  '【ｲ.最高の高さ】　　m',
]

const VALUES = {
  'T-1-01': { value: 'x', from: '案件' },
  'T-2-02.最高の高さ': { value: '12.00', from: 'ボリューム' },
}

const rowOf = (fieldId: string) => planRowsOf(FORM, PARAGRAPHS, VALUES).find((r) => r.fieldId === fieldId)!

describe('見出しの探し方（仕様 PL1〜PL3）', () => {
  it('PL1: 見出しは、その面の中だけで探す（第二面の「番号」は第二面の段落に見つかる）', () => {
    expect(locateHeadingOf(PARAGRAPHS, [1, 4], '【1.番号】')).toBe(1)
    expect(locateHeadingOf(PARAGRAPHS, [5, 8], '【1.番号】')).toBe(5)
    expect(rowOf('T-2-01').action.kind).toBe('human')
  })

  it('PL2: 見出しは段落の先頭一致（後ろに □ などが続いてもよい）', () => {
    expect(locateHeadingOf(PARAGRAPHS, [1, 4], '【4.防火地域】')).toBe(2)
    expect(rowOf('T-1-02').action.kind).toBe('human')
  })

  it('PL3: 同じ面に同じ見出しが複数あるとき、occurrence 番目を探す', () => {
    const twice = ['（第一面）', '【1.番号】', '【1.番号】']
    expect(locateHeadingOf(twice, [1, 3], '【1.番号】', 2)).toBe(2)
    expect(locateHeadingOf(twice, [1, 3], '【1.番号】', 3)).toBeNull()
  })
})

describe('細目の探し方（仕様 PL4）', () => {
  it('PL4: 細目は、親の見出しの段落を含めて、親の後ろを探す（親の段落の中の「番号」も見つかる）', () => {
    const parent = rowOf('T-2-02')
    expect(parent.action.kind).toBe('human')
    const sub = planRowsOf(FORM, PARAGRAPHS, VALUES).find((r) => r.heading === '【6.昇降機の概要】' && r.fieldId !== 'T-2-02')
    expect(sub).toBeDefined()
    expect(sub!.action.kind).toBe('human')
  })
})

describe('欄ごとの行動（仕様 PL5）', () => {
  it('PL5: 行政の欄は書かない（government）、値がある欄は入れる（fill）、見つからない・版に無い欄はそれぞれ印を付ける', () => {
    expect(rowOf('T-1-03').action.kind).toBe('government')
    expect(rowOf('T-1-01').action).toEqual({ kind: 'fill', value: 'x', from: '案件' })
    expect(rowOf('T-1-04').action.kind).toBe('absent')
    expect(rowOf('T-1-05').action.kind).toBe('notFound')
  })
})

describe('細目の値（仕様 PL6）', () => {
  it('PL6: 細目の名前（イ.最高の高さ → 最高の高さ）で値を探す', () => {
    expect(subLabelOf('【ｲ.最高の高さ】')).toBe('最高の高さ')
    expect(subLabelOf('【ロ.氏名】')).toBe('氏名')
    const sub = planRowsOf(FORM, PARAGRAPHS, VALUES).find((r) => r.fieldId === 'T-2-02.最高の高さ')
    expect(sub!.action).toEqual({ kind: 'fill', value: '12.00', from: 'ボリューム' })
  })
})
