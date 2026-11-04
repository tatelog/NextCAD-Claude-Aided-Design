import { describe, expect, it } from 'vitest'
import docsJson from './permitDocuments.json'
import formsJson from './permitForms.json'
import frameJson from './permitFrame.json'
import sourcesJson from './permitSources.json'

// 仕様: 図書・記入項目・図枠の値はすべて出典 ID を持つ（図枠の仮置きは出典が無くても仮置きの印を持つ）。
// 参照する出典 ID は出典一覧に存在し、各出典は URL・取得日・確度を持つ。

type Source = { id: string; url: string; accessedAt: string; level: string }
const sources = (sourcesJson as { sources: Source[] }).sources
const sourceIds = new Set(sources.map((s) => s.id))

const documents = (docsJson as { documents: { name: string; sourceIds: string[] }[] }).documents
const forms = (formsJson as { forms: { sourceIds: string[]; faces: { fields: { id: string; sourceIds: string[] }[] }[] }[] }).forms
const frame = frameJson as {
  sheets: { sourceIds: string[] }[]
  titleBlock: { provisional: boolean }
  scaleCandidates: { provisional: boolean }[]
}

describe('出典の記録（permitSources.json）', () => {
  it('各出典は URL・取得日・確度（一次・二次など）を持つ', () => {
    expect(sources.length).toBeGreaterThan(0)
    for (const s of sources) {
      expect(s.url).toMatch(/^https:\/\//)
      expect(s.accessedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(s.level.length).toBeGreaterThan(0)
    }
  })

  it('出典 ID は重複しない', () => {
    expect(sourceIds.size).toBe(sources.length)
  })
})

describe('値と出典の対応', () => {
  it('図書の全項目は、存在する出典 ID を1つ以上持つ', () => {
    expect(documents.length).toBeGreaterThan(0)
    for (const d of documents) {
      expect(d.sourceIds.length, d.name).toBeGreaterThan(0)
      for (const id of d.sourceIds) expect(sourceIds.has(id), `${d.name} の ${id}`).toBe(true)
    }
  })

  it('記入項目の全項目は、存在する出典 ID を1つ以上持つ', () => {
    for (const form of forms) {
      for (const face of form.faces) {
        for (const field of face.fields) {
          expect(field.sourceIds.length, field.id).toBeGreaterThan(0)
          for (const id of field.sourceIds) expect(sourceIds.has(id), `${field.id} の ${id}`).toBe(true)
        }
      }
    }
  })

  it('図枠の用紙寸法は出典を持ち、仮置きの値は仮置きの印を持つ', () => {
    for (const sheet of frame.sheets) {
      expect(sheet.sourceIds.length).toBeGreaterThan(0)
      for (const id of sheet.sourceIds) expect(sourceIds.has(id)).toBe(true)
    }
    expect(frame.titleBlock.provisional).toBe(true)
    for (const c of frame.scaleCandidates) expect(c.provisional).toBe(true)
  })
})
