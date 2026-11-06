// 仕様（統括の依頼 2026-11-06。2-b: 取り込んだ様式の中身と、アプリが欄に入れるつもりの値を並べる）:
// U3: 行動の文は決まっている（入れる・人が入れる・行政が記入・表のセル・見つからない・版に無い）。
// U4: 件数と欄の行を出す。行の中身は、面・見出し・行動の文。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { actionTextOf, PermitFormPlanView } from './PermitFormPlanView'

describe('欄の行動の文（仕様 U3）', () => {
  it('U3: 行動ごとの文', () => {
    expect(actionTextOf({ kind: 'fill', value: '12.00', from: 'ボリューム' })).toBe('入れる：12.00（ボリューム）')
    expect(actionTextOf({ kind: 'human' })).toBe('人が入れる（空欄）')
    expect(actionTextOf({ kind: 'government' })).toBe('行政が記入（書かない）')
    expect(actionTextOf({ kind: 'tableCell' })).toBe('表のセル（次の段で記入）')
    expect(actionTextOf({ kind: 'notFound' })).toBe('見出しが無い（空欄の一覧へ）')
    expect(actionTextOf({ kind: 'absent' })).toBe('東京都の版に無い')
  })
})

describe('欄の一覧の画面（仕様 U4）', () => {
  it('U4: 件数と欄の行（面・見出し・行動の文）を出す', () => {
    const out = renderToStaticMarkup(
      createElement(PermitFormPlanView, {
        title: '第二号様式（確認申請書（建築物））',
        rows: [
          { fieldId: 'F2-1-01', label: '申請年月日', face: '第一面', heading: '年　　月　　日', action: { kind: 'fill', value: '2026.11.06', from: '案件' }, note: '' },
          { fieldId: 'F2-1-02', label: '申請者氏名', face: '第一面', heading: '申請者氏名', action: { kind: 'human' }, note: '' },
          { fieldId: 'F2-1-03', label: '手数料', face: '第一面', heading: '※手数料欄', action: { kind: 'government' }, note: '行政が記入' },
        ],
      }),
    )
    expect(out).toContain('入れる 1')
    expect(out).toContain('人が入れる 1')
    expect(out).toContain('行政が記入 1')
    expect(out).toContain('申請者氏名')
    expect(out).toContain('入れる：2026.11.06（案件）')
  })
})
