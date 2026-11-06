// 取り込んだ様式に、値を書く指示を作る（統括の依頼 2026-11-06。2-c）。決定論。AI は使わない。
// 欄の見出しで段落を探し（permitFormPlan の規則）、値は対応表の入れ方（見出しの後ろ・括弧の番目）で入れる。
// 値の行き先（ROUTES）は、ボリュームの値（formValuesFromVolume のキー）ごとに、対応表の注記を読んで決めた。
import type { FillInstruction } from '../export/docxWrite'
import { faceRangesOf, locateHeadingOf, locateSubitemOf, type FormDef, type TokyoSubitem, type ValueMap } from './permitFormPlan'
import { normalizeLabel } from '../export/docxRead'

/** 値の行き先。sub は細目の見出し（対応表のまま）、bracket は括弧の番目（0 から）。 */
const ROUTES: Record<string, { field: string; sub?: string; bracket?: number }> = {
  'F2-3-10': { field: 'F2-3-10', sub: '【ｲ.建築物全体】', bracket: 2 },
  'F2-3-11': { field: 'F2-3-11', sub: '【ｲ.建築物全体】', bracket: 2 },
  'F2-3-12': { field: 'F2-3-12', sub: '【ｲ.申請に係る建築物の数】' },
  'F2-3-13.最高の高さ': { field: 'F2-3-13', sub: '【ｲ.最高の高さ】', bracket: 0 },
  'F2-3-13.階数（地上）': { field: 'F2-3-13', sub: '【ﾛ.階数】', bracket: 0 },
  'F2-4-08': { field: 'F2-4-08', sub: '【ｲ.地階を除く階数】', bracket: 0 },
  'F2-4-09.最高の高さ': { field: 'F2-4-09', sub: '【ｲ.最高の高さ】', bracket: 0 },
  // 床面積の合計は、細目「ﾛ.合計」の段落の 3 つ目の括弧（(申請部分)(申請以外の部分)(合計) の順）
  'F2-4-12': { field: 'F2-4-12', sub: '【ﾛ.合計】', bracket: 2 },
  'F2-6-01': { field: 'F2-6-01' },
  'F2-6-02': { field: 'F2-6-02' },
  'F2-6-03.最高の高さ': { field: 'F2-6-03', sub: '【ｲ.最高の高さ】' },
}

export interface FillPlanItem extends FillInstruction {
  fieldId: string
  label: string
}

export interface Unwritten {
  fieldId: string
  reason: string
}

export interface FillPlan {
  instructions: FillPlanItem[]
  unwritten: Unwritten[]
}

const normOf = (s: string): string => normalizeLabel(s)

/** 値を書く指示と、書けなかった欄（理由つき）を作る */
export function fillInstructionsOf(form: FormDef, paragraphs: readonly string[], values: ValueMap): FillPlan {
  const ranges = faceRangesOf(
    paragraphs,
    form.faces.map((f) => f.title),
  )
  const fields = new Map<string, { face: FormDef['faces'][number]; field: FormDef['faces'][number]['fields'][number] }>()
  for (const face of form.faces) for (const field of face.fields) fields.set(field.id, { face, field })

  const instructions: FillPlanItem[] = []
  const unwritten: Unwritten[] = []
  for (const [key, v] of Object.entries(values)) {
    // 行き先の表に無い欄は、欄の id をそのまま使う（既定）。既定で書けるのは、細目を持たない見出しの後ろの欄だけ
    const isDefault = ROUTES[key] === undefined
    const route = ROUTES[key] ?? (fields.has(key) ? { field: key } : undefined)
    const entry = route === undefined ? undefined : fields.get(route.field)
    if (route === undefined || entry === undefined || entry.field.tokyo === undefined) {
      unwritten.push({ fieldId: key, reason: '書く欄が対応表に無い' })
      continue
    }
    const t = entry.field.tokyo
    if ((t.note ?? '').includes('行政')) {
      unwritten.push({ fieldId: key, reason: '行政が記入する欄（書かない）' })
      continue
    }
    if (isDefault && ((t.subitems ?? []).length > 0 || (t.note ?? '').includes('細目'))) {
      unwritten.push({ fieldId: key, reason: '細目へ入れる欄（行き先の表に無い）' })
      continue
    }
    const range = ranges.get(normOf(entry.face.title))
    if (range === undefined) {
      unwritten.push({ fieldId: key, reason: '面が見つからない' })
      continue
    }
    const parentIdx = locateHeadingOf(paragraphs, range, t.heading, t.occurrence ?? 1)
    if (parentIdx === null) {
      unwritten.push({ fieldId: key, reason: `見出しが無い（${t.heading}）` })
      continue
    }
    if (route.sub !== undefined) {
      const sub: TokyoSubitem | undefined = (t.subitems ?? []).find((s) => normOf(s.heading) === normOf(route.sub!))
      if (sub === undefined) {
        unwritten.push({ fieldId: key, reason: `細目が対応表に無い（${route.sub}）` })
        continue
      }
      const idx = locateSubitemOf(paragraphs, range, parentIdx, sub.heading, sub.occurrence ?? 1)
      if (idx === null) {
        unwritten.push({ fieldId: key, reason: `細目の見出しが無い（${sub.heading}）` })
        continue
      }
      const item = placeOf(sub.place ?? '', sub.heading, route.bracket, sub.unit)
      if (item === null) {
        unwritten.push({ fieldId: key, reason: `入れ方が未対応（${sub.place}）` })
        continue
      }
      if (item.kind === 'beforeUnit' && !hasUnitAfter(paragraphs[idx]!, sub.heading, item.unit ?? '')) {
        unwritten.push({ fieldId: key, reason: `単位が無い（${item.unit ?? ''}）` })
        continue
      }
      if (item.kind === 'blanks' && bracketsOf(paragraphs[idx]!).length <= (item.bracket ?? 0)) {
        unwritten.push({ fieldId: key, reason: `括弧が見つからない（${sub.heading}）` })
        continue
      }
      instructions.push({ fieldId: key, label: entry.field.label, paragraphIndex: idx, ...item, value: v.value })
      continue
    }
    if (isDefault && t.place !== 'afterHeading') {
      unwritten.push({ fieldId: key, reason: `入れ方が未対応（${t.place}）` })
      continue
    }
    const item = placeOf(t.place, t.heading, route.bracket, t.unit)
    if (item === null) {
      unwritten.push({ fieldId: key, reason: `入れ方が未対応（${t.place}）` })
      continue
    }
    if (item.kind === 'beforeUnit' && !hasUnitAfter(paragraphs[parentIdx]!, t.heading, item.unit ?? '')) {
      unwritten.push({ fieldId: key, reason: `単位が無い（${item.unit ?? ''}）` })
      continue
    }
    if (item.kind === 'blanks' && bracketsOf(paragraphs[parentIdx]!).length <= (item.bracket ?? 0)) {
      unwritten.push({ fieldId: key, reason: `括弧が見つからない（${t.heading}）` })
      continue
    }
    instructions.push({ fieldId: key, label: entry.field.label, paragraphIndex: parentIdx, ...item, value: v.value })
  }
  return { instructions, unwritten }
}

/** 段落の中の括弧（（　）・(　)）の並び。docxWrite の書き込みと同じ数え方 */
function bracketsOf(text: string): RegExpMatchArray[] {
  return [...text.matchAll(/[（(][　 ]*[）)]/g)]
}

/** 入れ方（対応表の place）を、書く指示の形にする。見出しの後ろ（afterHeading）・括弧（fillBlanks）・単位の前（beforeUnit）に対応 */
function placeOf(
  place: string,
  heading: string,
  bracket: number | undefined,
  unit: string | undefined,
): Pick<FillInstruction, 'kind' | 'heading' | 'bracket' | 'unit'> | null {
  if (place === 'afterHeading') return { kind: 'after', heading }
  if (place === 'fillBlanks') return { kind: 'blanks', bracket: bracket ?? 0 }
  if (place === 'beforeUnit' && unit !== undefined) return { kind: 'beforeUnit', heading, unit }
  return null
}

/** 見出しの後ろに単位があるか（見出しの中の同じ文字は数えない） */
function hasUnitAfter(text: string, heading: string, unit: string): boolean {
  const h = text.indexOf(heading)
  return h >= 0 && unit !== '' && text.indexOf(unit, h + heading.length) >= 0
}
