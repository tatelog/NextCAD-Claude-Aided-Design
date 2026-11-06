// 仕様（統括の指示 2026-11-06、代表の決定「使う人が自分で取ってきて取り込む。今回は東京都の Word の版」。形は開発｜メインと合わせた）:
// 仕様 1: 図書マスタの欄（3 様式・112 欄）のすべてに、東京都の Word の版の中での探し方（tokyo）がある。
// 仕様 2: 探し方は、面の段落（face）・見出しの文字（heading。様式のファイルの文字のまま）・置き場（in: 段落か表のセル）・
//         値の入れ方（place）。東京都の版に見出しが無い欄は absent: true とし、理由（note）を書く。
// 仕様 3: 面は、第二号が「（第一面）」〜「（第六面）」、第三号が「建築計画概要書（第一面）」〜「（第三面）」、第八号（昇降機用）が「（第二面）」
//         （空白を除いて比べる）。図書マスタの面の順と合う。
// 仕様 4: 欄番号のある欄の見出しは、文字を正規化（NFKC）して空白を除くと「【番号.」で始まる（例: 【7.敷地面積】）。
// 仕様 5: 細目のある欄は、細目ごとに同じ形の探し方（tokyo.subitems）を、細目と同じ数・同じ順で持つ。
// 仕様 6: 第一面の行政の欄（※手数料欄・※受付欄など）は表のセル（tableCell）。
import { describe, expect, it } from 'vitest'
import formsJson from './permitForms.json'

type Tokyo = {
  face?: string
  heading?: string
  in?: 'paragraph' | 'tableCell'
  place?: string
  occurrence?: number
  absent?: boolean
  note?: string
  subitems?: Tokyo[]
}
type Field = { id: string; no?: number; label: string; subitems?: string[]; tokyo?: Tokyo }
type Face = { no: number | null; title: string; fields: Field[] }
type Form = { id: string; faces: Face[] }

const forms = (formsJson as unknown as { forms: Form[] }).forms
const fields = forms.flatMap((f) => f.faces.flatMap((face) => face.fields.map((field) => ({ form: f.id, face, field }))))
const PLACES = ['afterHeading', 'fillBlanks', 'cellRight', 'cellBelow', 'checkbox', 'nextParagraphs']
const norm = (s: string) => s.normalize('NFKC').replace(/[\s　]/g, '')

const FACES: Record<string, string[]> = {
  F2: ['（第一面）', '（第二面）', '（第三面）', '（第四面）', '（第五面）', '（第六面）'],
  F3: ['建築計画概要書（第一面）', '建築計画概要書（第二面）', '建築計画概要書（第三面）'],
  F8: ['（第二面）'],
}

function checkShape(t: Tokyo, where: string) {
  if (t.absent) {
    expect(t.note, `${where} の note`).toBeTruthy()
    return
  }
  expect(t.heading, `${where} の heading`).toBeTruthy()
  expect(['paragraph', 'tableCell'], `${where} の in`).toContain(t.in)
  expect(PLACES, `${where} の place`).toContain(t.place)
}

describe('東京都の Word の版の中での欄の探し方（統括の指示 2026-11-06）', () => {
  it('仕様 1: 112 欄のすべてに探し方がある', () => {
    expect(fields).toHaveLength(112)
    for (const { field } of fields) expect(field.tokyo, field.id).toBeDefined()
  })

  it('仕様 2: 探し方は heading・in・place を持つ（無い欄は absent と理由）', () => {
    for (const { field } of fields) checkShape(field.tokyo!, field.id)
  })

  it('仕様 3: 面の段落は様式の面の見出しで、図書マスタの面の順と合う', () => {
    for (const form of forms) {
      form.faces.forEach((face, i) => {
        for (const field of face.fields) {
          if (field.tokyo?.absent) continue
          expect(norm(field.tokyo!.face ?? ''), field.id).toBe(norm(FACES[form.id]![i]!))
        }
      })
    }
  })

  it('仕様 4: 欄番号のある欄の見出しは「【番号.」で始まる', () => {
    for (const { field } of fields) {
      if (field.no === undefined || field.tokyo?.absent) continue
      expect(norm(field.tokyo!.heading!).startsWith(`【${field.no}.`), `${field.id}: ${field.tokyo!.heading}`).toBe(true)
    }
  })

  it('仕様 5: 細目のある欄は、細目と同じ数・同じ順の探し方を持つ', () => {
    for (const { field } of fields) {
      if (!field.subitems) continue
      expect(field.tokyo!.subitems?.length, field.id).toBe(field.subitems.length)
      field.tokyo!.subitems!.forEach((s, i) => checkShape(s, `${field.id} の細目 ${field.subitems![i]}`))
    }
  })

  it('仕様 6: 第一面の行政の欄は表のセル', () => {
    for (const id of ['F2-1-04', 'F2-1-05', 'F2-1-06', 'F2-1-07', 'F2-1-08', 'F2-1-09']) {
      expect(fields.find((f) => f.field.id === id)!.field.tokyo!.in, id).toBe('tableCell')
    }
  })
})
