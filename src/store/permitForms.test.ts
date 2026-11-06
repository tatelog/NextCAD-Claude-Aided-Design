// 仕様（統括の依頼 2026-11-06。2-a: 取り込んだ様式は、画面の中（店舗）だけに持つ。どこへも送らない）:
// S1: 最初は、どの様式も取り込んでいない。
// S2: 取り込むと、その様式が入る。外すと、入っていない状態に戻る。
import { beforeEach, describe, expect, it } from 'vitest'
import { usePermitForms } from './permitForms'

beforeEach(() => usePermitForms.setState({ forms: {} }))

describe('取り込んだ様式の置き場（仕様 S1・S2）', () => {
  it('S1: 最初は、どの様式も入っていない', () => {
    expect(usePermitForms.getInitialState().forms).toEqual({})
  })

  it('S2: 取り込むと入り、外すと入っていない状態に戻る', () => {
    usePermitForms.getState().importForm('F2', 'x.docx', new Uint8Array([1, 2]), ['第二号様式'])
    expect(usePermitForms.getState().forms.F2).toMatchObject({ fileName: 'x.docx', paragraphs: ['第二号様式'] })
    usePermitForms.getState().removeForm('F2')
    expect(usePermitForms.getState().forms.F2).toBeUndefined()
  })
})
