// 取り込んだ Word が、どの様式かを見分ける（統括の依頼 2026-11-06。2-a）。見出しの文字（空白を除いて比べる）で決める。
import { normalizeLabel } from '../export/docxRead'

/** 様式の ID は、調査の対応表（permitForms.json）の ID に合わせる。F8＝第八号 昇降機、F8E＝第八号 昇降機以外の建築設備 */
export type FormKind = 'F2' | 'F3' | 'F8' | 'F8E'

/** 画面に並べる順 */
export const FORM_KINDS: readonly FormKind[] = ['F2', 'F3', 'F8', 'F8E']

export const FORM_TITLE: Record<FormKind, string> = {
  F2: '第二号様式（確認申請書（建築物））',
  F3: '第三号様式（建築計画概要書（本庁用））',
  F8: '第八号様式（昇降機）',
  F8E: '第八号様式（昇降機以外の建築設備）',
}

/** 先頭の段落（見出し）で様式を見分ける。見分けられなければ null */
export function formKindOf(paragraphs: readonly string[]): FormKind | null {
  const head = paragraphs.slice(0, 12).map(normalizeLabel).join('\n')
  if (head.includes('第二号様式')) return 'F2'
  if (head.includes('第三号様式')) return 'F3'
  if (head.includes('第八号様式')) {
    if (head.includes('昇降機以外の建築設備')) return 'F8E'
    if (head.includes('昇降機')) return 'F8'
  }
  return null
}
