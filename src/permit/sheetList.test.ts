// 仕様: 建築確認申請の図書一覧（P5 の確認申請 PDF の図書の表。モック a7ae7718 の P5 と、施行規則・表二の RC 共同住宅の行）。
// 仕様 1: 図書の一覧に、確認申請書・付近見取図・配置図・各階平面図・立面図・断面図・日影図・求積図が入る（モックの 6 行を含む）。
// 仕様 2: RC 造の共同住宅で規則上必要な図書（基礎伏図・各階床伏図・構造詳細図・使用構造材料一覧表・施工方法等計画書）が入る。
// 仕様 3: 根拠が未確認の図書（日影図の適用条件など）は、確認済みとは別の印を付ける（推測で必要と言い切らない）。
// 仕様 4: 法的チェック（図書ごと）: 立面図・断面図は道路斜線の判定に従う（超過・適合・未判定）。日影図は日影の判定に従う（未判定は要確認）。
//          確認申請書は申請者の記入の有無で「記入済」「未記入」。どの判定にも関係ない図書は「—」。
// 仕様 5: 道路斜線の判定が無いときは「要確認」（適合と言い切らない）。
import { describe, expect, it } from 'vitest'
import { SHEETS, legalCheckFor, type LegalState } from './sheetList'

const noJudgment: LegalState = { roadSlope: null, shadow: null, applicantFilled: false }

describe('SHEETS（図書の一覧）', () => {
  it('モックの 6 行を含む', () => {
    const names = SHEETS.map((s) => s.name)
    for (const n of ['確認申請書（第一面〜第六面）', '付近見取図・配置図', '各階平面図', '立面図・断面図', '日影図', '求積図']) {
      expect(names).toContain(n)
    }
  })

  it('RC 共同住宅で規則上必要な図書を含む', () => {
    const names = SHEETS.map((s) => s.name)
    for (const n of ['基礎伏図・各階床伏図・小屋伏図', '構造詳細図（鉄筋・かぶり）', '使用構造材料一覧表', '施工方法等計画書']) {
      expect(names).toContain(n)
    }
  })

  it('根拠が未確認の図書は confirmed を false にする', () => {
    const shadow = SHEETS.find((s) => s.name === '日影図')!
    expect(shadow.confirmed).toBe(false)
    const frame = SHEETS.find((s) => s.name === '確認申請書（第一面〜第六面）')!
    expect(frame.confirmed).toBe(true)
  })
})

describe('legalCheckFor（図書ごとの法的チェック）', () => {
  const elevation = SHEETS.find((s) => s.name === '立面図・断面図')!
  const shadow = SHEETS.find((s) => s.name === '日影図')!
  const form = SHEETS.find((s) => s.name === '確認申請書（第一面〜第六面）')!
  const plan = SHEETS.find((s) => s.name === '各階平面図')!

  it('道路斜線が超過なら、立面図・断面図は「道路斜線 超過」（警告）', () => {
    expect(legalCheckFor(elevation, { ...noJudgment, roadSlope: '超過' })).toEqual({ text: '道路斜線 超過', tone: 'warn' })
  })

  it('道路斜線が適合なら、立面図・断面図は「道路斜線 適合」', () => {
    expect(legalCheckFor(elevation, { ...noJudgment, roadSlope: '適合' })).toEqual({ text: '道路斜線 適合', tone: 'ok' })
  })

  it('道路斜線の判定が無ければ「道路斜線 要確認」（適合と言い切らない）', () => {
    expect(legalCheckFor(elevation, noJudgment)).toEqual({ text: '道路斜線 要確認', tone: 'warn' })
  })

  it('日影の判定が無い日影図は「日影 未判定（条例値が未決）」', () => {
    expect(legalCheckFor(shadow, noJudgment)).toEqual({ text: '日影 未判定（条例値が未決）', tone: 'warn' })
  })

  it('日影が適合なら日影図は「日影 適合」', () => {
    expect(legalCheckFor(shadow, { ...noJudgment, shadow: '適合' })).toEqual({ text: '日影 適合', tone: 'ok' })
  })

  it('申請者が記入済みなら確認申請書は「記入済」、未記入なら「未記入」', () => {
    expect(legalCheckFor(form, { ...noJudgment, applicantFilled: true })).toEqual({ text: '記入済', tone: 'ok' })
    expect(legalCheckFor(form, noJudgment)).toEqual({ text: '未記入', tone: 'warn' })
  })

  it('判定に関係ない図書は「—」', () => {
    expect(legalCheckFor(plan, { ...noJudgment, roadSlope: '超過', shadow: '不適合' })).toEqual({ text: '—', tone: 'none' })
  })
})
