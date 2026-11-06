// 仕様（統括の承認 2026-11-06。docx-preview 0.4.1 と jszip 3.10.2 を、版を固定して入れる（^ を付けない））:
// TP1: package.json の dependencies に、docx-preview は "0.4.1"、jszip は "3.10.2" を、そのまま書く（^ や ~ を付けない）。
// TP2: docx-preview の Apache-2.0 の本文と、jszip の MIT の本文を、repo の licenses/ に置く。
// TP3: THIRD_PARTY_NOTICES.md に、両方の名前と版と、jszip は MIT を選んだことを書く。
import { describe, expect, it } from 'vitest'
import pkg from '../../package.json'
import docxPreviewLicense from '../../licenses/docx-preview-LICENSE.txt?raw'
import jszipLicense from '../../licenses/jszip-LICENSE.markdown?raw'
import notices from '../../THIRD_PARTY_NOTICES.md?raw'

const deps = pkg.dependencies as Record<string, string>

describe('第三者の部品の版とライセンス（仕様 TP1〜TP3）', () => {
  it('TP1: docx-preview は 0.4.1、jszip は 3.10.2 で、版を固定して書く', () => {
    expect(deps['docx-preview']).toBe('0.4.1')
    expect(deps['jszip']).toBe('3.10.2')
  })

  it('TP2: docx-preview の Apache-2.0 の本文と、jszip の MIT の本文を repo に置く', () => {
    expect(docxPreviewLicense).toContain('Apache License')
    expect(docxPreviewLicense).toContain('Version 2.0')
    expect(jszipLicense).toContain('The MIT License')
  })

  it('TP3: 同梱の説明に、両方の名前と版と、jszip は MIT を選んだことを書く', () => {
    expect(notices).toContain('docx-preview')
    expect(notices).toContain('0.4.1')
    expect(notices).toContain('jszip')
    expect(notices).toContain('3.10.2')
    expect(notices).toContain('MIT')
  })
})
