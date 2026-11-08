// 様式の表示（統括の依頼 2026-11-06・代表承認。第二号（申請書）と第三号（概要書）を、記入した様式のまま全ページ見せる）。
// 見せる対象と、描けないとき一覧へ戻す文を決める。決定論（描画の部品は PermitFormPreview.tsx）。
import type { FormKind } from '../law/permitFormKind'

/** 様式で見せる対象の種類（第二号・第三号だけ。第八号は一覧のまま） */
export type DocxViewKind = 'F2' | 'F3'

const DOCX_VIEW_HEADS: readonly { head: string; kind: DocxViewKind }[] = [
  { head: '第二号様式', kind: 'F2' },
  { head: '第三号様式', kind: 'F3' },
]

/** 書類の名前から、様式で見せる対象かを決める。対象でなければ null */
export function docxViewKindOfName(name: string): DocxViewKind | null {
  const hit = DOCX_VIEW_HEADS.find((h) => name.includes(h.head))
  return hit === undefined ? null : hit.kind
}

/** 記入した docx（ファイル名とバイト列）。store の FilledForm と同じ形 */
export interface FilledFormFile {
  fileName: string
  bytes: Uint8Array
}

/** 書類の行をどう見せるか。docx は記入した様式を描く。list は一覧のまま（reason は一覧に添える理由。無ければ null） */
export type PreviewPlan = { mode: 'docx'; fileName: string; bytes: Uint8Array } | { mode: 'list'; reason: string | null }

/** 書類の行の見せ方。対象外・未記入は一覧（未記入は理由を添える） */
export function previewPlanOf(name: string, filled: Partial<Record<FormKind, FilledFormFile>>): PreviewPlan {
  const kind = docxViewKindOfName(name)
  if (kind === null) return { mode: 'list', reason: null }
  const f = filled[kind]
  if (f === undefined) return { mode: 'list', reason: '記入すると、ここに様式が出ます' }
  return { mode: 'docx', fileName: f.fileName, bytes: f.bytes }
}

/** 描けなかったときに一覧へ戻すときの文（例外の中身を添える。例外でない値も文にする） */
export function renderFailureTextOf(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  return `様式を描けませんでした（${msg}）。下の一覧で中身を見てください。`
}

/** 描画の上に出す一言（画面の区切りは Word のページと一致しない。統括の判断 2026-11-06） */
export const FORM_PAGE_NOTE = '画面の区切りは Word のページと一致しない（印刷は Word で開いて確かめる）'

/** 描いた面を表示の箱の幅に合わせる倍率（統括の判断 2026-11-06）。箱 ÷ 描く幅。1 を超えない。幅が分からない（0・負・数でない）ときは 1 */
export function fitZoomOf(boxWidth: number, naturalWidth: number): number {
  if (!Number.isFinite(boxWidth) || !Number.isFinite(naturalWidth) || boxWidth <= 0 || naturalWidth <= 0) return 1
  return Math.min(1, boxWidth / naturalWidth)
}
