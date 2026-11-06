// 仕様（統括の依頼 2026-11-06。2-c）: 記入した docx は、画面の中（店舗）だけに持つ。外すと入っていない状態に戻る。
// S3: 記入した docx を入れると、その様式の記入済みが入る。外すと入っていない状態に戻る。
import { beforeEach, describe, expect, it } from 'vitest'
import { usePermitForms } from './permitForms'

beforeEach(() => usePermitForms.setState({ forms: {}, filled: {} }))

describe('記入した docx の置き場（仕様 S3）', () => {
  it('S3: 記入した docx を入れると入り、外すと入っていない状態に戻る', () => {
    usePermitForms.getState().setFilled('F2', '第二号様式_記入.docx', new Uint8Array([1, 2, 3]))
    expect(usePermitForms.getState().filled.F2).toMatchObject({ fileName: '第二号様式_記入.docx' })
    usePermitForms.getState().clearFilled('F2')
    expect(usePermitForms.getState().filled.F2).toBeUndefined()
  })
})
