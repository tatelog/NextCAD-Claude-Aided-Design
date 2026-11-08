// 出力のビューア（1-a・1-c）の中身を作る。判定の結果はそのまま使い、判定は変えない（統括の依頼 2026-11-06）。
import type { PermitJudgement } from '../law/permitRequired'
import type { FormKind } from '../law/permitFormKind'
import { SITE_MISSING_TEXT } from '../export/drawingSvg'

export type ViewerGroup = '要る' | '要確認' | '要らない'

/** 書類の中身の種類の文（一か所。言い換えはここだけ） */
export const CONTENT_LABEL = {
  form: '様式が未配置（様式を置けば記入して出す）',
  formFilled: '記入済み（一式の 01_申請書 に入る）',
  user: '人が用意する書類',
  site: '配置図（確定した敷地と周辺建物の輪郭）',
  floorPlan: '各階平面図（基準階 1 枚）',
  notMade: '未作成',
} as const

/** 中身を作れる図面（名前で決まる）。ほかの図面は「未作成」 */
export const DRAWING_KEY_OF_NAME: Record<string, 'site' | 'floorPlan' | 'shadow' | 'vicinity' | 'floorArea' | undefined> = {
  付近見取図:'vicinity',
  床面積求積図:'floorArea',
  日影図: 'shadow',
  配置図: 'site',
  各階平面図: 'floorPlan',
}

/** 図面が作れないときの既定の理由（渡されないときに使う）。配置図の理由は作図の結果で決まる */
export const DRAWING_MISSING_DEFAULT = {
  site: SITE_MISSING_TEXT.notConfirmed,
  floorPlan: '平面を作ると出せます',
} as const

/** 左の一覧の先頭に出す、判定とモデルの項目 */
export const FIXED_VIEWER_ITEMS = ['判定の一覧', 'IFC（BIM のモデル）'] as const

export interface ViewerRow {
  name: string
  group: ViewerGroup
  reason: string | null
  content: string
}

interface DocLike {
  name: string
  kind: string
}

function contentOf(name: string, docs: readonly DocLike[]): string {
  const key = DRAWING_KEY_OF_NAME[name]
  if (key === 'vicinity') return '付近見取図（敷地位置・国土地理院の周辺地図）'
  if (key === 'floorArea') return '床面積求積図（保存輪郭・吹抜け控除）'
  if (key === 'shadow') return '日影図（時刻日影・地盤面）'
  if (key === 'site') return CONTENT_LABEL.site
  if (key === 'floorPlan') return CONTENT_LABEL.floorPlan
  const doc = docs.find((d) => d.name === name)
  if (doc?.kind === 'form') return CONTENT_LABEL.form
  if (doc?.kind === 'drawing') return CONTENT_LABEL.notMade
  return CONTENT_LABEL.user
}

/** 判定の結果を、要る・要確認・要らない（理由つき）の順に並べる */
export function viewerRowsOf(j: PermitJudgement, docs: readonly DocLike[]): ViewerRow[] {
  return [
    ...j.required.map((name) => ({ name, group: '要る' as const, reason: null, content: contentOf(name, docs) })),
    ...j.needsCheck.map((r) => ({ name: r.name, group: '要確認' as const, reason: r.reason, content: contentOf(r.name, docs) })),
    ...j.notRequired.map((r) => ({ name: r.name, group: '要らない' as const, reason: r.reason, content: contentOf(r.name, docs) })),
  ]
}

export interface IfcSummary {
  /** # で始まる行の数（エンティティ数） */
  entities: number
  /** UTF-8 の byte 数 */
  bytes: number
}

export function ifcSummaryOf(text: string): IfcSummary {
  const entities = text.split('\n').filter((l) => /^#\d+=/.test(l)).length
  return { entities, bytes: new TextEncoder().encode(text).length }
}

/** 書類の名前から様式（FormKind）を決める。様式でなければ null（第八号は昇降機と昇降機以外の建築設備の 2 つ） */
export function formKindOfName(name: string): FormKind | null {
  if (name.includes('第二号様式')) return 'F2'
  if (name.includes('第三号様式')) return 'F3'
  if (name.includes('第八号様式')) {
    if (name.includes('昇降機以外の建築設備')) return 'F8E'
    if (name.includes('昇降機')) return 'F8'
  }
  return null
}

/** 行の中身。記入した様式がある行だけ「記入済み」に変える。他の行は中身のまま（統括の判断 2026-11-06） */
export function rowContentOf(row: ViewerRow, filled: Partial<Record<FormKind, unknown>>): string {
  if (row.content !== CONTENT_LABEL.form) return row.content
  const kind = formKindOfName(row.name)
  return kind !== null && filled[kind] !== undefined ? CONTENT_LABEL.formFilled : row.content
}
