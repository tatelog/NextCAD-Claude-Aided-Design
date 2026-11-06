// docx（Word）を読む（統括の依頼 2026-11-06。2-a）。本文（word/document.xml）の、表の外の段落の文字を順番どおりに取る。
import { readZip } from './zipReader'

export interface DocxRead {
  /** 本文の XML（そのまま） */
  xml: string
  /** 表の外の段落の文字（空でない段落だけ、順番どおり） */
  paragraphs: string[]
  /** 表の数（入れ子を含む） */
  tableCount: number
  /** zip の中身（名前 → 中身）。書き戻しに使う */
  parts: Map<string, Uint8Array>
}

/** 見出しの照合用に、全角半角（NFKC）をそろえ、空白（半角・全角）を除く */
export function normalizeLabel(s: string): string {
  return s.normalize('NFKC').replace(/\s+/g, '')
}

const decodeEntities = (s: string): string =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

/** 表（入れ子を含む）を取り除いた残りの XML */
function stripTables(xml: string): string {
  const re = /<w:tbl>|<\/w:tbl>/g
  let depth = 0
  let last = 0
  let out = ''
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    if (m[0] === '<w:tbl>') {
      if (depth === 0) out += xml.slice(last, m.index) + ' '
      depth++
    } else {
      depth--
      if (depth === 0) last = m.index + m[0].length
    }
  }
  return out + xml.slice(last)
}

/** 段落の文字（空でないもの）を、順番どおりに取る */
export function paragraphsOfXml(xml: string): string[] {
  const paras = stripTables(xml).match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []
  const texts: string[] = []
  for (const p of paras) {
    const t = decodeEntities((p.match(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g) ?? []).map((x) => x.replace(/^<w:t(?: [^>]*)?>|<\/w:t>$/g, '')).join(''))
    if (t.trim() !== '') texts.push(t)
  }
  return texts
}

export async function readDocx(bytes: Uint8Array): Promise<DocxRead> {
  const parts = await readZip(bytes)
  const doc = parts.get('word/document.xml')
  if (!doc) throw new Error('docx の本文（word/document.xml）が無い')
  const xml = new TextDecoder('utf-8').decode(doc)
  return { xml, paragraphs: paragraphsOfXml(xml), tableCount: (xml.match(/<w:tbl>/g) ?? []).length, parts }
}
