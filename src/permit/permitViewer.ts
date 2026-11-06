// 出力のビューア（1-a・1-c）の中身を作る。判定の結果はそのまま使い、判定は変えない（統括の依頼 2026-11-06）。
import type { PermitJudgement } from '../law/permitRequired'

export type ViewerGroup = '要る' | '要確認' | '要らない'

/** 書類の中身の種類の文（一か所。言い換えはここだけ） */
export const CONTENT_LABEL = {
  form: '様式が未配置（様式を置けば記入して出す）',
  user: '人が用意する書類',
  site: '配置図（確定した敷地と周辺建物の輪郭）',
  floorPlan: '各階平面図（基準階 1 枚）',
  notMade: '未作成',
} as const

/** 中身を作れる図面（名前で決まる）。ほかの図面は「未作成」 */
export const DRAWING_KEY_OF_NAME: Record<string, 'site' | 'floorPlan' | undefined> = {
  配置図: 'site',
  各階平面図: 'floorPlan',
}

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
