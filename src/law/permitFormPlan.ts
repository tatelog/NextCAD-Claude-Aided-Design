// 取り込んだ様式の欄ごとに、アプリが何をするかを決める（統括の依頼 2026-11-06。2-b）。決定論。AI は使わない。
// 見出しの探し方は、調査の対応表（permitForms.json の tokyo）の規則に従う: 面の範囲の中で、段落の先頭一致、occurrence 番目。
// 細目は、親の見出しの段落を含めて親の後ろを探す。
import { normalizeLabel } from '../export/docxRead'

/** 各階の床面積の行の数（東京都の版は、見出しと次の 5 段落。統括の依頼 2026-11-06。8） */
export const FLOOR_ROWS = 6

export interface TokyoSubitem {
  heading: string
  in?: string
  place?: string
  note?: string
  occurrence?: number
  inlineHeading?: string
  /** place が beforeUnit のとき、単位（「階」「ｍ」）。値はその前に入る */
  unit?: string
}

export interface TokyoSpec {
  face: string
  heading: string
  in: 'paragraph' | 'tableCell'
  place: string
  occurrence?: number
  absent?: boolean
  note?: string
  subitems?: TokyoSubitem[]
  /** place が beforeUnit のとき、単位（「階」「ｍ」）。値はその前に入る */
  unit?: string
}

export interface FormField {
  id: string
  label: string
  tokyo?: TokyoSpec
}

export interface FormFace {
  no: number
  title: string
  fields: FormField[]
}

export interface FormDef {
  id: string
  name: string
  faces: FormFace[]
}

/** アプリが欄に入れる値（欄の id → 値と、その出どころ） */
export type ValueMap = Record<string, { value: string; from: string }>

export type PlanAction =
  | { kind: 'fill'; value: string; from: string }
  | { kind: 'human' }
  | { kind: 'government' }
  | { kind: 'tableCell' }
  | { kind: 'notFound' }
  | { kind: 'absent' }

export interface PlanRow {
  fieldId: string
  label: string
  face: string
  heading: string
  action: PlanAction
  note: string
}

/** 面の見出し（「（第一面）」）を比べる形（空白・全角半角をそろえ、括弧を除く） */
const faceKeyOf = (s: string): string => normalizeLabel(s).replace(/[()（）]/g, '')

/** 面ごとの段落の範囲（面の見出しの次の段落から、次の面の見出しの手前まで） */
export function faceRangesOf(paragraphs: readonly string[], faceTitles: readonly string[]): Map<string, [number, number]> {
  const keys = faceTitles.map(faceKeyOf)
  const starts: { key: string; idx: number }[] = []
  paragraphs.forEach((p, i) => {
    const k = faceKeyOf(p)
    if (keys.includes(k)) starts.push({ key: k, idx: i })
  })
  const out = new Map<string, [number, number]>()
  starts.forEach((s, j) => {
    const end = j + 1 < starts.length ? starts[j + 1]!.idx : paragraphs.length
    out.set(s.key, [s.idx + 1, end])
  })
  return out
}

/** 範囲の中で、見出しで始まる段落の、occurrence 番目（1 から）の位置。無ければ null */
export function locateHeadingOf(paragraphs: readonly string[], range: [number, number], heading: string, occurrence = 1): number | null {
  const h = normalizeLabel(heading)
  let k = 0
  for (let i = range[0]; i < range[1]; i++) {
    if (normalizeLabel(paragraphs[i]!).startsWith(h)) {
      k++
      if (k === occurrence) return i
    }
  }
  return null
}

/** 細目の位置。親の見出しの段落（parentIdx）を含めて、その後ろを探す */
export function locateSubitemOf(
  paragraphs: readonly string[],
  range: [number, number],
  parentIdx: number,
  heading: string,
  occurrence = 1,
): number | null {
  const h = normalizeLabel(heading)
  let k = 0
  for (let i = parentIdx; i < range[1]; i++) {
    if (normalizeLabel(paragraphs[i]!).startsWith(h)) {
      k++
      if (k === occurrence) return i
    }
  }
  return null
}

/** 細目の名前（【ｲ.最高の高さ】→「最高の高さ」）。全角半角をそろえ、括弧と「イ.」などの記号を除く */
export function subLabelOf(heading: string): string {
  const s = normalizeLabel(heading).replace(/^[【[]/, '').replace(/[】\]]$/, '')
  // 「ﾆ.】構造」のように、東京都の版の見出しに残る括弧は、名前から外す（統括の依頼 2026-11-06。構造の直し）
  return s.replace(/^[^.]*\./, '').replace(/^[】\]]+/, '')
}

const keyOf = (fieldId: string, sub?: string): string => normalizeLabel(sub === undefined ? fieldId : `${fieldId}.${sub}`)

/** 値の探し方を揃えた表（キーを正規化して引けるようにする） */
const normalizedValues = (values: ValueMap): Map<string, { value: string; from: string }> => {
  const m = new Map<string, { value: string; from: string }>()
  for (const [k, v] of Object.entries(values)) m.set(normalizeLabel(k), v)
  return m
}

/** 欄ごとに、アプリが何をするかを並べる（面の順・欄の順。細目は親の後ろ） */
export function planRowsOf(form: FormDef, paragraphs: readonly string[], values: ValueMap): PlanRow[] {
  const ranges = faceRangesOf(
    paragraphs,
    form.faces.map((f) => f.title),
  )
  const vals = normalizedValues(values)
  const rows: PlanRow[] = []
  for (const face of form.faces) {
    const range = ranges.get(faceKeyOf(face.title))
    for (const field of face.fields) {
      const t = field.tokyo
      if (!t) continue
      const base = { fieldId: field.id, label: field.label, face: face.title, heading: t.heading }
      if (t.absent) {
        rows.push({ ...base, action: { kind: 'absent' }, note: t.note ?? '' })
        continue
      }
      if (t.in === 'tableCell') {
        const action: PlanAction = (t.note ?? '').includes('行政') ? { kind: 'government' } : { kind: 'tableCell' }
        rows.push({ ...base, action, note: t.note ?? '' })
        continue
      }
      const idx = range === undefined ? null : locateHeadingOf(paragraphs, range, t.heading, t.occurrence ?? 1)
      if (range === undefined || idx === null) {
        rows.push({ ...base, action: { kind: 'notFound' }, note: t.note ?? '' })
        continue
      }
      rows.push({ ...base, action: actionOf(keyOf(field.id), t.note, vals), note: t.note ?? '' })
      for (const sub of t.subitems ?? []) {
        // 1 段落に見出しが 2 つあるとき（inlineHeading）は、後ろの見出しの名前で行を分ける（統括の依頼 2026-11-06。4）
        const name = subLabelOf(sub.inlineHeading ?? sub.heading)
        const sidx = locateSubitemOf(paragraphs, range, idx, sub.heading, sub.occurrence ?? 1)
        const subRow = { fieldId: `${field.id}.${name}`, label: `${field.label}（${name}）`, face: face.title, heading: sub.heading }
        const floorAction = name === '階別' ? floorActionOf(keyOf(field.id, name), vals) : null
        const action: PlanAction = sidx === null ? { kind: 'notFound' } : (floorAction ?? actionOf(keyOf(field.id, name), sub.note, vals))
        rows.push({ ...subRow, action, note: sub.note ?? '' })
      }
    }
  }
  return rows
}

/** 各階の床面積（階別）の行。階ごとの値（「prefix」＋階の番号）があれば、最上階までを「入れる」と出す。行が足りない（行の数を超える）ときは出さない */
function floorActionOf(prefix: string, vals: Map<string, { value: string; from: string }>): PlanAction | null {
  let count = 0
  let top: { n: number; from: string } | null = null
  for (const [k, v] of vals) {
    if (!k.startsWith(prefix)) continue
    const n = Number(k.slice(prefix.length))
    if (!Number.isInteger(n) || n < 1) continue
    count++
    if (top === null || n > top.n) top = { n, from: v.from }
  }
  if (top === null || count > FLOOR_ROWS) return null
  return { kind: 'fill', value: `最上階 ${top.n} 階まで（各階）`, from: top.from }
}

/** 欄の行動。行政の欄は書かない。値があれば入れる。それ以外は人が入れる */
function actionOf(key: string, note: string | undefined, vals: Map<string, { value: string; from: string }>): PlanAction {
  if ((note ?? '').includes('行政')) return { kind: 'government' }
  const v = vals.get(key)
  if (v !== undefined) return { kind: 'fill', value: v.value, from: v.from }
  return { kind: 'human' }
}
