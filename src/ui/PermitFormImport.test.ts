// 仕様（統括の依頼 2026-11-06。2-a: 出力の画面に「様式を取り込む」を置く）:
// U1: 四つの様式（第二号・第三号・第八号 昇降機・第八号 昇降機以外）の欄を、取り込んでいない（未取り込み）として出す。
// U2: 取り込んだ様式は「取り込み済み」とファイル名を出す。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { usePermitForms } from '../store/permitForms'
import { PermitFormImportView } from './PermitFormImport'

beforeEach(() => usePermitForms.setState({ forms: {} }))

describe('様式の取り込みの欄（仕様 U1・U2）', () => {
  it('U1: 四つの様式を、未取り込みとして出す', () => {
    const out = renderToStaticMarkup(createElement(PermitFormImportView, { forms: {}, message: null, onPick: () => undefined }))
    expect(out).toContain('第二号様式')
    expect(out).toContain('第三号様式')
    expect(out).toContain('第八号様式（昇降機）')
    expect(out).toContain('第八号様式（昇降機以外の建築設備）')
    expect(out.split('未取り込み').length - 1).toBe(4)
  })

  it('U2: 取り込んだ様式は、取り込み済みとファイル名を出す', () => {
    const out = renderToStaticMarkup(
      createElement(PermitFormImportView, { forms: { F3: { fileName: '第三号様式.docx' } }, message: null, onPick: () => undefined }),
    )
    expect(out).toContain('取り込み済み：第三号様式.docx')
    expect(out.split('未取り込み').length - 1).toBe(3)
  })
})
