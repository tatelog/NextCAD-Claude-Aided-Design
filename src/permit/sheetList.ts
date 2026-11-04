// 建築確認申請の図書一覧（P5 の確認申請 PDF の表）と、図書ごとの法的チェック（F14）。
// 図書の根拠: 施行規則 第1条の3（正本・副本）、表一（全件共通）、表二（RC 造の共同住宅の行）。
// 根拠を確認できていない図書は confirmed を false にする。書式一式（自治体・申請の種類で変わる）は未決のため、ここでは確定しない。

export interface Sheet {
  name: string
  /** 根拠（条文・表） */
  basis: string
  /** 根拠を確認済みか。false は「要確認」の印を付けて出す */
  confirmed: boolean
}

export const SHEETS: Sheet[] = [
  { name: '確認申請書（第一面〜第六面）', basis: '施行規則 第1条の3 第1項（第二号様式）', confirmed: true },
  { name: '建築計画概要書', basis: '施行規則 第1条の3 第1項（第三号様式）', confirmed: true },
  { name: '付近見取図・配置図', basis: '表一（い）', confirmed: true },
  { name: '各階平面図', basis: '表一（い）・表二（RC）', confirmed: true },
  { name: '求積図', basis: '表一（い）（床面積求積図）', confirmed: true },
  { name: '立面図・断面図', basis: '表一（ろ）・表二（RC）（二面以上）', confirmed: true },
  { name: '地盤面算定表', basis: '表一（ろ）', confirmed: true },
  { name: '基礎伏図・各階床伏図・小屋伏図', basis: '表一（は）・表二（RC）', confirmed: true },
  { name: '構造詳細図（鉄筋・かぶり）', basis: '表二（RC）', confirmed: true },
  { name: '使用構造材料一覧表', basis: '表二（RC）', confirmed: true },
  { name: '施工方法等計画書', basis: '表二（RC）', confirmed: true },
  { name: '日影図', basis: '表二（二十九）。適用条件は未確認', confirmed: false },
]

export interface LegalState {
  /** 道路斜線の判定（P2）。判定が無ければ null */
  roadSlope: '適合' | '超過' | null
  /** 日影の判定（P2）。条例値が未決の間は null */
  shadow: '適合' | '不適合' | null
  /** 申請者（P5）の記入があるか */
  applicantFilled: boolean
}

export interface LegalCheck {
  text: string
  tone: 'ok' | 'warn' | 'none'
}

export function legalCheckFor(sheet: Sheet, legal: LegalState): LegalCheck {
  if (sheet.name === '確認申請書（第一面〜第六面）') {
    return legal.applicantFilled ? { text: '記入済', tone: 'ok' } : { text: '未記入', tone: 'warn' }
  }
  if (sheet.name === '立面図・断面図') {
    if (legal.roadSlope === '超過') return { text: '道路斜線 超過', tone: 'warn' }
    if (legal.roadSlope === '適合') return { text: '道路斜線 適合', tone: 'ok' }
    return { text: '道路斜線 要確認', tone: 'warn' }
  }
  if (sheet.name === '日影図') {
    if (legal.shadow === '適合') return { text: '日影 適合', tone: 'ok' }
    if (legal.shadow === '不適合') return { text: '日影 不適合', tone: 'warn' }
    return { text: '日影 未判定（条例値が未決）', tone: 'warn' }
  }
  return { text: '—', tone: 'none' }
}
