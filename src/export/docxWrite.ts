// docx に値を入れて書き出す（統括の依頼 2026-11-06。2-c）。本文（word/document.xml）だけを書き換え、ほかの部品はそのまま zip に入れ直す。決定論。
import { readDocx } from './docxRead'
import { buildZip } from './zipWriter'

export interface ParagraphSpan {
  /** document.xml の中の位置（段落の XML の始まりと終わり） */
  start: number
  end: number
  /** 段落の XML */
  xml: string
  /** 段落の文字（readDocx の paragraphs と同じ並び・同じ内容） */
  text: string
}

/** 書き込みの指示。paragraphIndex は readDocx の paragraphs の並び（表の外の段落）の番号 */
export interface FillInstruction {
  paragraphIndex: number
  /** after: 見出しの後ろの空白に入れる / blanks: 括弧の bracket 番目（1 から数えず 0 から）に入れる */
  kind: 'after' | 'blanks' | 'beforeUnit'
  heading?: string
  bracket?: number
  /** beforeUnit: 単位（「階」「ｍ」）の前に入れる。単位は見出しの後ろで探す */
  unit?: string
  value: string
}

const decodeEntities = (s: string): string =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
const encodeText = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** 表（入れ子を含む）の位置の範囲 */
function tableRangesOf(xml: string): [number, number][] {
  const re = /<w:tbl>|<\/w:tbl>/g
  const out: [number, number][] = []
  let depth = 0
  let open = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    if (m[0] === '<w:tbl>') {
      if (depth === 0) open = m.index
      depth++
    } else {
      depth--
      if (depth === 0) out.push([open, m.index + m[0].length])
    }
  }
  return out
}

/** 段落の文字（w:t の並び。readDocx と同じ） */
function textOfParagraph(pXml: string): string {
  return decodeEntities((pXml.match(/<w:t(?: [^>]*)?>[^<]*<\/w:t>/g) ?? []).map((x) => x.replace(/^<w:t(?: [^>]*)?>|<\/w:t>$/g, '')).join(''))
}

/** 表の外の段落（文字が空でないもの）を、位置つきで並べる。readDocx の paragraphs と同じ並び */
export function paragraphSpansOf(xml: string): ParagraphSpan[] {
  const tables = tableRangesOf(xml)
  const out: ParagraphSpan[] = []
  const re = /<w:p[ >][\s\S]*?<\/w:p>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    const start = m.index
    const end = start + m[0].length
    if (tables.some(([a, b]) => start >= a && end <= b)) continue
    const text = textOfParagraph(m[0])
    if (text.trim() === '') continue
    out.push({ start, end, xml: m[0], text })
  }
  return out
}

/** 段落の中の w:t の並び（位置と文字） */
function textNodesOf(pXml: string): { start: number; end: number; text: string }[] {
  const out: { start: number; end: number; text: string }[] = []
  const re = /<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(pXml)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length, text: decodeEntities(m[1] ?? '') })
  }
  return out
}

/** 段落の文字の [from, to) を値に置き換える（値は最初に重なる w:t に入れ、重なる他の w:t は空にする） */
function setPlainRange(pXml: string, from: number, to: number, value: string): string {
  const nodes = textNodesOf(pXml)
  if (nodes.length === 0) return pXml
  const plainLen = nodes.reduce((s, n) => s + n.text.length, 0)
  const plain = nodes.map((n) => n.text).join('')
  let ps = 0
  const offsets = nodes.map((n) => {
    const o = { s: ps, e: ps + n.text.length }
    ps = o.e
    return o
  })
  let insertAt = offsets.findIndex((o) => from >= o.s && from < o.e)
  if (insertAt < 0) insertAt = nodes.length - 1
  let out = pXml
  // 後ろの w:t から書き換える（位置がずれないように）
  for (let k = nodes.length - 1; k >= 0; k--) {
    const o = offsets[k]!
    let text = ''
    for (let pos = o.s; pos < o.e; pos++) {
      if (pos === from && k === insertAt) text += value
      if (pos < from || pos >= to) text += plain[pos]
    }
    if (k === insertAt && from >= plainLen) text += value
    const n = nodes[k]!
    out = out.slice(0, n.start) + `<w:t xml:space="preserve">${encodeText(text)}</w:t>` + out.slice(n.end)
  }
  return out
}

/** 見出しの後ろの空白を、値に置き換える（見出しの文字は残す） */
export function replaceAfterHeadingInParagraph(pXml: string, heading: string, value: string): string {
  const plain = textOfParagraph(pXml)
  const idx = plain.indexOf(heading)
  if (idx < 0) return pXml
  const after = idx + heading.length
  const blank = /^[　 ]*/.exec(plain.slice(after))![0].length
  return setPlainRange(pXml, after, after + blank, value)
}

/** 括弧（（　）・(　)）の bracket 番目（0 から）の中に、値を入れる。括弧の記号は残す */
export function fillBlanksInParagraph(pXml: string, bracket: number, value: string): string {
  const plain = textOfParagraph(pXml)
  const runs = [...plain.matchAll(/[（(][　 ]*[）)]/g)]
  const run = runs[bracket]
  if (run === undefined) return pXml
  const open = run[0][0]!
  const close = run[0].slice(-1)
  return setPlainRange(pXml, run.index!, run.index! + run[0].length, `${open}${value}${close}`)
}

/** 見出しの後ろにある単位（「階」「ｍ」など）の前の空白を、値に置き換える。単位が無ければ何もしない。見出しの中の同じ文字には入れない */
export function beforeUnitInParagraph(pXml: string, heading: string, unit: string, value: string): string {
  const plain = textOfParagraph(pXml)
  const h = plain.indexOf(heading)
  if (h < 0) return pXml
  const from = h + heading.length
  const u = plain.indexOf(unit, from)
  if (u < 0) return pXml
  const ws = /[　 ]*$/.exec(plain.slice(from, u))![0].length
  return setPlainRange(pXml, u - ws, u, value)
}

/** 指示を段落に当てて、docx を書き出す。ほかの部品はそのまま */
export async function fillDocx(bytes: Uint8Array, instructions: readonly FillInstruction[]): Promise<Uint8Array> {
  const d = await readDocx(bytes)
  const spans = paragraphSpansOf(d.xml)
  let xml = d.xml
  for (let i = spans.length - 1; i >= 0; i--) {
    const sp = spans[i]!
    const todo = instructions.filter((x) => x.paragraphIndex === i)
    if (todo.length === 0) continue
    let p = sp.xml
    for (const x of todo) {
      if (x.kind === 'after') p = replaceAfterHeadingInParagraph(p, x.heading ?? '', x.value)
      else if (x.kind === 'beforeUnit') p = beforeUnitInParagraph(p, x.heading ?? '', x.unit ?? '', x.value)
      else p = fillBlanksInParagraph(p, x.bracket ?? 0, x.value)
    }
    xml = xml.slice(0, sp.start) + p + xml.slice(sp.end)
  }
  const parts = new Map(d.parts)
  parts.set('word/document.xml', new TextEncoder().encode(xml))
  return buildZip([...parts].map(([path, data]) => ({ path, data })))
}
