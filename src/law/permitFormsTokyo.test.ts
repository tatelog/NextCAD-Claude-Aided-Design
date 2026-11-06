// 仕様（統括の指示 2026-11-06、代表の決定「使う人が自分で取ってきて取り込む。今回は東京都の Word の版」。形は開発｜メインと合わせた）:
// 仕様 1: 図書マスタの欄（4 様式・136 欄）のすべてに、東京都の Word の版の中での探し方（tokyo）がある。
// 仕様 2: 探し方は、面の段落（face）・見出しの文字（heading。様式のファイルの文字のまま）・置き場（in: 段落か表のセル）・
//         値の入れ方（place）。東京都の版に見出しが無い欄は absent: true とし、理由（note）を書く。
// 仕様 3: 面は、第二号が「（第一面）」〜「（第六面）」、第三号が「建築計画概要書（第一面）」〜「（第三面）」、第八号（昇降機用）が「（第二面）」
//         と「（第一面）」、第八号（昇降機以外の建築設備用）が「（第一面）」「（第二面）」（空白を除いて比べる）。図書マスタの面の順と合う。
// 仕様 4: 欄番号のある欄の見出しは、文字を正規化（NFKC）して空白を除くと「【番号.」で始まる（例: 【7.敷地面積】）。
// 仕様 5: 細目のある欄は、細目ごとに同じ形の探し方（tokyo.subitems）を、細目と同じ数・同じ順で持つ。
// 仕様 6: 第一面の行政の欄（※手数料欄・※受付欄など）は表のセル（tableCell）。
// 仕様 7（統括の指示 2026-11-06。図書マスタの不足 3 件）: (1) 第二号 第三面 7 欄の細目に「備考」（チ．）。
//         (2) 第八号（昇降機以外の建築設備用）の第一面・第二面の欄。(3) 第八号（昇降機用）の第一面の欄。
//         label は国の様式（e-Gov の PDF）の見出し、tokyo は東京都の版の見出し（誤記はファイルの文字のまま）。
import { describe, expect, it } from 'vitest'
import formsJson from './permitForms.json'

type Tokyo = {
  unit?: string
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
const PLACES = ['afterHeading', 'fillBlanks', 'beforeUnit', 'cellRight', 'cellBelow', 'checkbox', 'nextParagraphs']
const norm = (s: string) => s.normalize('NFKC').replace(/[\s　]/g, '')

const FACES: Record<string, string[]> = {
  F2: ['（第一面）', '（第二面）', '（第三面）', '（第四面）', '（第五面）', '（第六面）'],
  F3: ['建築計画概要書（第一面）', '建築計画概要書（第二面）', '建築計画概要書（第三面）'],
  F8: ['（第一面）', '（第二面）'],
  F8E: ['（第一面）', '（第二面）'],
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
  it('仕様 1: 136 欄のすべてに探し方がある', () => {
    expect(fields).toHaveLength(136)
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
    for (const id of ['F2-1-04', 'F2-1-05', 'F2-1-06', 'F2-1-07', 'F2-1-08', 'F2-1-09', 'F8-1-03', 'F8-1-04', 'F8-1-05', 'F8-1-06', 'F8-1-07', 'F8E-1-03', 'F8E-1-04', 'F8E-1-05', 'F8E-1-06', 'F8E-1-07']) {
      expect(fields.find((f) => f.field.id === id)!.field.tokyo!.in, id).toBe('tableCell')
    }
  })
})

describe('図書マスタの不足 3 件（統括の指示 2026-11-06）', () => {
  const field = (id: string) => fields.find((f) => f.field.id === id)!.field
  const labels = (form: string, title: string) =>
    forms.find((f) => f.id === form)!.faces.find((face) => face.title === title)!.fields.map((f) => f.label)
  const FIRST = ['申請年月日', '申請者氏名', '※手数料欄', '※受付欄', '※決裁欄', '※確認番号欄', '係員氏名']

  it('仕様 7 (1): 第二号 第三面 7 欄（敷地面積）の細目の最後に「備考」があり、東京都の版では【ﾁ.備考】', () => {
    expect(field('F2-3-07').subitems?.at(-1)).toBe('備考')
    expect(field('F2-3-07').tokyo!.subitems!.at(-1)!.heading).toBe('【ﾁ.備考】')
  })

  it('仕様 7 (2): 第八号（昇降機以外の建築設備用）は、第一面の 7 欄と第二面の 1〜10 欄を持つ', () => {
    expect(labels('F8E', '第一面')).toEqual(FIRST)
    expect(labels('F8E', '第二面')).toEqual([
      '設置者', '代理者', '設計者', '工事施工者', '設置する建築物', '建築設備の概要',
      '工事着手予定年月日', '工事完了予定年月日', '特定工程工事終了予定年月日', '備考',
    ])
  })

  it('仕様 7 (2): 東京都の版の誤記「【１．設置主】」は、ファイルの文字のまま見出しにする', () => {
    expect(field('F8E-2-01').tokyo!.heading).toBe('【１．設置主】')
  })

  it('仕様 7 (3): 第八号（昇降機用）は、第一面の 7 欄を持つ（第二号と違い、設計者氏名と消防関係同意欄は無い）', () => {
    expect(labels('F8', '第一面')).toEqual(FIRST)
  })
})

// 仕様 8（開発｜メイン fa20f68、2026-11-06）: 括弧が無く、単位（階・ｍ）の前に値を入れる細目は place=beforeUnit と unit を持つ。
// 単位は東京都の版の段落に実際にある（見出しの後ろ）。単位が段落に無いときは書かず、理由で残す。
describe('単位の前に入れる細目（開発の指定 fa20f68）', () => {
  const sub = (id: string, heading: string) => {
    const f = fields.find((x) => x.field.id === id)!.field
    return f.tokyo!.subitems!.find((s) => s.heading === heading)!
  }

  it('仕様 8: 【ｲ.地階を除く階数】は beforeUnit で、単位は「階」', () => {
    const t = sub('F2-4-08', '【ｲ.地階を除く階数】')
    expect(t.place).toBe('beforeUnit')
    expect(t.unit).toBe('階')
  })

  it('仕様 8: 【ｲ.最高の高さ】（第四面 9 欄）と【ﾛ.最高の軒の高さ】は beforeUnit で、単位は「ｍ」', () => {
    expect(sub('F2-4-09', '【ｲ.最高の高さ】')).toMatchObject({ place: 'beforeUnit', unit: 'ｍ' })
    expect(sub('F2-4-09', '【ﾛ.最高の軒の高さ】')).toMatchObject({ place: 'beforeUnit', unit: 'ｍ' })
  })

  it('仕様 8: beforeUnit の細目は、すべて単位（unit）を持つ', () => {
    for (const { field } of fields) {
      for (const s of field.tokyo?.subitems ?? []) {
        if (s.place === 'beforeUnit') expect(s.unit, `${field.id} ${s.heading}`).toBeTruthy()
      }
    }
  })

  it('仕様 8: 【ﾛ.合計】（床面積）は fillBlanks のまま（段落の括弧 3 つ目に入る）', () => {
    expect(sub('F2-4-12', '【ﾛ.合計】').place).toBe('fillBlanks')
  })
})
