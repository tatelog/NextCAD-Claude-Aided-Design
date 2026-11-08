import { describe, expect, it } from 'vitest'
import formsJson from './permitForms.json'

// 仕様: 第二号様式（確認申請書）は第一面〜第六面、第三号様式（建築計画概要書）は第一面〜第三面。
// 各面の見出し（番号つき）が欠けず、各項目に出典 ID と記入元のデータ（D-03 の表・列）を持つ。

type Field = { id: string; no?: number; label: string; subitems?: string[]; dataSource: string; sourceIds: string[] }
type Face = { no: number; title: string; heading: string; fields: Field[] }
type Form = { id: string; name: string; sourceIds: string[]; faces: Face[] }

const forms = (formsJson as { forms: Form[] }).forms
const form2 = forms.find((f) => f.id === 'F2')
const form3 = forms.find((f) => f.id === 'F3')

const numbered = (face: Face | undefined) => (face?.fields ?? []).filter((f) => f.no !== undefined)
const labelsOf = (face: Face | undefined) => (face?.fields ?? []).map((f) => f.label)

describe('第二号様式（確認申請書）の記入項目', () => {
  it('第一面から第六面まで、面の番号順に並ぶ', () => {
    expect(form2).toBeDefined()
    expect(form2?.faces.map((f) => f.no)).toEqual([1, 2, 3, 4, 5, 6])
    expect(form2?.faces.map((f) => f.title)).toEqual(['第一面', '第二面', '第三面', '第四面', '第五面', '第六面'])
  })

  it('第一面には申請者氏名・設計者氏名・確認番号欄がある', () => {
    const labels = labelsOf(form2?.faces[0])
    expect(labels).toEqual(expect.arrayContaining(['申請者氏名', '設計者氏名', '※確認番号欄']))
  })

  it('第二面（建築主等の概要）は番号1〜9の見出しを持つ', () => {
    expect(numbered(form2?.faces[1]).map((f) => f.label)).toEqual([
      '建築主',
      '代理者',
      '設計者',
      '建築設備の設計に関し意見を聴いた者',
      '工事監理者',
      '工事施工者',
      '構造計算適合性判定の申請',
      '建築物エネルギー消費性能確保計画の提出',
      '備考',
    ])
  })

  it('第三面（建築物及びその敷地）は番号1〜19の見出しを持ち、面積と高さの欄が欠けない', () => {
    const face = numbered(form2?.faces[2])
    expect(face.map((f) => f.no)).toEqual(Array.from({ length: 19 }, (_, i) => i + 1))
    expect(face.map((f) => f.label)).toEqual(
      expect.arrayContaining(['地名地番', '防火地域', '道路', '敷地面積', '建築面積', '延べ面積', '建築物の高さ等', '建築物の数']),
    )
  })

  it('第四面（建築物別概要）は番号1〜19の見出しを持ち、構造と階数と高さを含む', () => {
    const face = numbered(form2?.faces[3])
    expect(face.map((f) => f.no)).toEqual(Array.from({ length: 19 }, (_, i) => i + 1))
    expect(face.map((f) => f.label)).toEqual(expect.arrayContaining(['構造', '階数', '高さ', '床面積', '外壁', '屋根']))
  })

  it('第五面（建築物の階別概要）は番号1〜9の見出しを持ち、用途別床面積を含む', () => {
    const face = numbered(form2?.faces[4])
    expect(face.map((f) => f.no)).toEqual(Array.from({ length: 9 }, (_, i) => i + 1))
    expect(face.map((f) => f.label)).toEqual(expect.arrayContaining(['階', '階の高さ', '用途別床面積']))
  })

  it('第六面（建築物独立部分別概要）は番号1〜8の見出しを持ち、構造計算の区分を含む', () => {
    const face = numbered(form2?.faces[5])
    expect(face.map((f) => f.no)).toEqual(Array.from({ length: 8 }, (_, i) => i + 1))
    expect(face.map((f) => f.label)).toEqual(expect.arrayContaining(['延べ面積', '構造計算の区分']))
  })

  it('各項目は一意の ID を持ち、出典 ID と記入元のデータ（D-03）を必ず持つ', () => {
    const all = (form2?.faces ?? []).flatMap((f) => f.fields)
    const ids = all.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const field of all) {
      expect(field.sourceIds.length).toBeGreaterThan(0)
      expect(field.dataSource.length).toBeGreaterThan(0)
    }
  })
})

describe('第三号様式（建築計画概要書）の記入項目', () => {
  it('第一面（建築主等の概要）は番号1〜7、第二面（建築物及びその敷地）は番号1〜20の見出しを持つ', () => {
    expect(form3).toBeDefined()
    expect(numbered(form3?.faces[0]).map((f) => f.label)).toEqual([
      '建築主',
      '代理者',
      '設計者',
      '建築設備の設計に関し意見を聴いた者',
      '工事監理者',
      '工事施工者',
      '備考',
    ])
    expect(numbered(form3?.faces[1]).map((f) => f.no)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
  })

  it('第二面は第二号様式の第三面と違い、12条の調査と防火設備の欄を持つ', () => {
    const labels = labelsOf(form3?.faces[1])
    expect(labels).toEqual(
      expect.arrayContaining([
        '建築基準法第12条第1項の規定による調査の要否',
        '建築基準法第12条第3項の規定による検査を要する防火設備の有無',
      ]),
    )
  })

  it('第三面は付近見取図と配置図を添付として持つ', () => {
    expect(labelsOf(form3?.faces[2])).toEqual(['付近見取図', '配置図'])
  })
})

// 仕様（施行規則 第1条の3 第4項ロ・第八号様式（昇降機用）第二面・注意⑩、原文 2026-11-05）:
// 6条1項1・2号の建築物に、法87条の4の昇降機（令146条1項1・2号）がある場合、別記第八号様式の「昇降機の概要」の事項を書いた書類が要る。
// 注意⑩: 建築物の確認申請と併せるときは、6欄の記載を第二号様式に追加添付すれば、第八号様式を別途出さなくてよい。
// 第一面は行政・申請者の記入欄なので、本システムの入力対象は第二面。
describe('第八号様式（確認申請書（昇降機）・昇降機用）の記入項目', () => {
  const form8 = forms.find((f) => f.id === 'F8')

  it('第二面は、番号1〜10の見出しを持つ（1設置者・2代理者・3設計者・4工事施工者・5設置する建築物・6昇降機の概要・7〜9 工事の予定・10備考）', () => {
    expect(labelsOf(form8?.faces.find((f) => f.title === '第二面'))).toEqual([
      '設置者',
      '代理者',
      '設計者',
      '工事施工者',
      '設置する建築物又は工作物',
      '昇降機の概要',
      '工事着手予定年月日',
      '工事完了予定年月日',
      '特定工程工事終了予定年月日',
      '備考',
    ])
  })

  it('6欄（昇降機の概要）は、番号・種別・用途・積載荷重・最大定員・定格速度・その他必要な事項を持つ', () => {
    const field = form8?.faces.find((f) => f.title === '第二面')?.fields.find((f) => f.label === '昇降機の概要')
    expect(field?.subitems).toEqual(['番号', '種別', '用途', '積載荷重', '最大定員', '定格速度', 'その他必要な事項'])
  })
})
