// 確認申請の図書の判定を、P5 の表と IFC と印刷に使う形にする（t91・G46）。決定論。
// 判定の中身は requiredPermitDocuments（law/permitRequired.ts）。ここは、その結果を画面の行にし、外形と体積と法的チェックを作る。
import type { FrameSize } from '../law/permitFrameSvg'
import type { PermitJudgement } from '../law/permitRequired'
import { extrudeOrReason, type ExtrudeResult } from '../volume/extrudeResult'

type Pt = { x: number; y: number }

export type JudgementKind = '要る' | '要らない' | '要確認'

export interface JudgementRow {
  kind: JudgementKind
  name: string
  /** 要らない・要確認の理由（要るには無い） */
  reason?: string
}

/** 判定の全件を、要る・要らない（理由つき）・要確認（理由つき）の行にする。要確認も落とさない（D-02 C11） */
export function judgementRowsOf(j: PermitJudgement): JudgementRow[] {
  return [
    ...j.required.map((name): JudgementRow => ({ kind: '要る', name })),
    ...j.notRequired.map((r): JudgementRow => ({ kind: '要らない', name: r.name, reason: r.reason })),
    ...j.needsCheck.map((r): JudgementRow => ({ kind: '要確認', name: r.name, reason: r.reason })),
  ]
}

/** 法 6 条 1 項・20 条 1 項の区分を、文にする */
export function applicabilityTextOf(j: PermitJudgement): string {
  return `法6条1項 ${j.applicability.article6} ／ 法20条1項 ${j.applicability.article20}`
}

export type OutlineState = { ok: true; footprint: Pt[] } | { ok: false; reason: string }

/** P2 の外形の状態。閉じていなければ「外形が未作成」（ダミーの外形で代えない） */
export function outlineStateOf(c: { closed: boolean; footprint: readonly Pt[] | null }): OutlineState {
  if (!c.closed || c.footprint === null) return { ok: false, reason: '外形が未作成' }
  return { ok: true, footprint: c.footprint.map((p) => ({ x: p.x, y: p.y })) }
}

/** 外形を階数・階高で立ち上げた体積（P2 と同じ立ち上げ。外形が作れないときは理由を返す） */
export function volumeOfOutline(footprint: readonly Pt[], storeyCount: number, storeyHeightMm: number): ExtrudeResult {
  return extrudeOrReason({ footprint: footprint.map((p) => ({ x: p.x, y: p.y })), storey_count: storeyCount, storey_height: storeyHeightMm })
}

export interface LegalDocState {
  /** 道路斜線の判定（P2）。判定が無ければ null */
  roadSlope: '適合' | '超過' | null
  /** 日影の判定（P2）。条例値が未決の間は null */
  shadow: '適合' | '不適合' | null
  /** 申請者（P5）の記入があるか */
  applicantFilled: boolean
}

export interface LegalDocCheck {
  text: string
  tone: 'ok' | 'warn' | 'none'
}

/** 図書ごとの法的チェック。図書の名前で決める（立面・断面は道路斜線、日影図は日影、申請書は申請者の記入） */
export function legalCheckOfDoc(name: string, legal: LegalDocState): LegalDocCheck {
  if (name === '確認申請書（第二号様式）') {
    return legal.applicantFilled ? { text: '記入済', tone: 'ok' } : { text: '未記入', tone: 'warn' }
  }
  if (name === '二面以上の立面図' || name === '二面以上の断面図') {
    if (legal.roadSlope === '超過') return { text: '道路斜線 超過', tone: 'warn' }
    if (legal.roadSlope === '適合') return { text: '道路斜線 適合', tone: 'ok' }
    return { text: '道路斜線 要確認', tone: 'warn' }
  }
  if (name === '日影図') {
    if (legal.shadow === '適合') return { text: '日影 適合', tone: 'ok' }
    if (legal.shadow === '不適合') return { text: '日影 不適合', tone: 'warn' }
    return { text: '日影 未判定（条例値が未入力）', tone: 'warn' }
  }
  return { text: '—', tone: 'none' }
}

/** P5 の図枠の選び（A3 横・A1）を、図枠の用紙に直す */
export function frameSizeOf(label: 'A3横' | 'A1'): FrameSize {
  return label === 'A1' ? 'A1' : 'A3'
}
