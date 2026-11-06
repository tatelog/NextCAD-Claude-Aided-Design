// 取り込んだ Word が、どの様式かを見分ける（統括の依頼 2026-11-06。2-a）。見出しの文字（空白を除いて比べる）で決める。
import { normalizeLabel } from '../export/docxRead'

export type FormKind = 'F2' | 'F3' | 'F8E' | 'F8O'

/** 画面に並べる順 */
export const FORM_KINDS: readonly FormKind[] = ['F2', 'F3', 'F8E', 'F8O']

export const FORM_TITLE: Record<FormKind, string> = {
  F2: '第二号様式（確認申請書（建築物））',
  F3: '第三号様式（建築計画概要書（本庁用））',
  F8E: '第八号様式（昇降機）',
  F8O: '第八号様式（昇降機以外の建築設備）',
}

/** 先頭の段落（見出し）で様式を見分ける。見分けられなければ null */
export function formKindOf(paragraphs: readonly string[]): FormKind | null {
  const head = paragraphs.slice(0, 12).map(normalizeLabel).join('\n')
  if (head.includes('第二号様式')) return 'F2'
  if (head.includes('第三号様式')) return 'F3'
  if (head.includes('第八号様式')) {
    if (head.includes('昇降機以外の建築設備')) return 'F8O'
    if (head.includes('昇降機')) return 'F8E'
  }
  return null
}
