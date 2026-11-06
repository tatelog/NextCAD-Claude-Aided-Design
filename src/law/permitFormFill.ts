// 取り込んだ様式に、値を書く指示を作る（統括の依頼 2026-11-06。2-c）。決定論。AI は使わない。
// 欄の見出しで段落を探し（permitFormPlan の規則）、値は対応表の入れ方（見出しの後ろ・括弧の番目）で入れる。
// 値の行き先（ROUTES）は、ボリュームの値（formValuesFromVolume のキー）ごとに、対応表の注記を読んで決めた。
import type { FillInstruction } from '../export/docxWrite'
import { FLOOR_ROWS, faceRangesOf, locateHeadingOf, locateSubitemOf, type FormDef, type TokyoSubitem, type ValueMap } from './permitFormPlan'
import { normalizeLabel } from '../export/docxRead'

/** 値の行き先。sub は細目の見出し（対応表のまま）、bracket は括弧の番目（0 から）。 */
const ROUTES: Record<string, { field: string; sub?: string; bracket?: number; brackets?: number[]; before?: string }> = {
  // 新築なので建物全体が申請部分。申請部分（1 番目）と合計（3 番目）に同じ値（統括の判断 2026-11-06）
  'F2-3-10': { field: 'F2-3-10', sub: '【ｲ.建築物全体】', brackets: [0, 2] },
  'F2-3-11': { field: 'F2-3-11', sub: '【ｲ.建築物全体】', brackets: [0, 2] },
  // 用途別床面積（第五面）: 共同住宅の行（【ｲ.】）の 1 番目（用途の区分）と 3 番目（床面積）。2 番目（具体的な用途の名称）は空欄
  'F2-5-07.用途': { field: 'F2-5-07', sub: '【ｲ.】', bracket: 0 },
  'F2-5-07.延べ面積': { field: 'F2-5-07', sub: '【ｲ.】', bracket: 2 },
  'F2-3-12': { field: 'F2-3-12', sub: '【ｲ.申請に係る建築物の数】' },
  'F2-3-13.最高の高さ': { field: 'F2-3-13', sub: '【ｲ.最高の高さ】', bracket: 0 },
  'F2-3-13.階数（地上）': { field: 'F2-3-13', sub: '【ﾛ.階数】', bracket: 0 },
  'F2-4-08': { field: 'F2-4-08', sub: '【ｲ.地階を除く階数】', bracket: 0 },
  'F2-4-09.最高の高さ': { field: 'F2-4-09', sub: '【ｲ.最高の高さ】', bracket: 0 },
  // 床面積の合計は、細目「ﾛ.合計」の段落の 3 つ目の括弧（(申請部分)(申請以外の部分)(合計) の順）
  'F2-4-12': { field: 'F2-4-12', sub: '【ﾛ.合計】', brackets: [0, 2] },
  // 1 段落に見出しが 2 つある細目（inlineHeading）。sub は、その細目の名前（後ろの見出し）で引く（値の元は、設置者の住所を持つようになってから）
  'F8E-2-01.郵便番号': { field: 'F8E-2-01', sub: '【ハ．郵便番号】' },
  'F8E-2-01.住所': { field: 'F8E-2-01', sub: '【ニ．住所】' },
  // 敷地面積（参考値）は、イの列 1（単一の地域。残りの列は空欄）と、ホ（合計）に入る（統括の依頼 2026-11-06。1・3）。ホの入れ方は対応表（beforeUnit・㎡）に従う
  'F2-3-07.敷地面積': { field: 'F2-3-07', sub: '【ｲ.敷地面積】', bracket: 0 },
  'F2-3-07.敷地面積の合計': { field: 'F2-3-07', sub: '【ﾎ.敷地面積の合計】' },
  // 防火地域（見出しと同じ段落の □ を、選んだ語で ■ にする。値は語そのもの）。構造は「造」の前の括弧（1 つ目）。道路の接する長さは、前面道路の辺の長さ（統括の依頼 2026-11-06。4・5・6）
  'F2-3-04': { field: 'F2-3-04' },
  // 構造は「造」の前に入る（東京都の版は括弧が無く、「造」の前の空白。統括の依頼 2026-11-06。構造の直し）
  'F2-4-04': { field: 'F2-4-04', before: '造' },
  'F2-6-03.構造': { field: 'F2-6-03', sub: '【ﾆ.】構造】', before: '造' },
  'F2-3-13.構造': { field: 'F2-3-13', sub: '【ﾊ.構造】', before: '造' },
  'F2-3-06.敷地と接している部分の長さ': { field: 'F2-3-06', sub: '【ﾛ.敷地と接している部分の長さ】' },
  'F2-3-06.幅員': { field: 'F2-3-06', sub: '【ｲ.幅員】' },
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

/** 各階の床面積の欄（F2-4-12.階別N。N は階の番号）と、階別の行の数（東京都の版は、見出しと次の 5 段落。最上階から） */
const FLOOR_KEY = /^F2-4-12\.階別(\d+)$/

const floorNumbersOf = (values: ValueMap): number[] => Object.keys(values).flatMap((k) => (FLOOR_KEY.test(k) ? [Number(FLOOR_KEY.exec(k)![1])] : []))

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
    // 各階の床面積（階ごとの行）。行の番号は最上階からの差。階の番号は（　階）に、面積は 3 つ目の括弧（合計）に入る（統括の依頼 2026-11-06。8）
    const floor = FLOOR_KEY.exec(key)
    if (floor !== null) {
      const n = Number(floor[1])
      const entryF = fields.get('F2-4-12')
      const rangeF = entryF === undefined ? undefined : ranges.get(normOf(entryF.face.title))
      const tF = entryF?.field.tokyo
      const parentF = rangeF === undefined || tF === undefined ? null : locateHeadingOf(paragraphs, rangeF, tF.heading, tF.occurrence ?? 1)
      const headF = rangeF === undefined || parentF === null ? null : locateSubitemOf(paragraphs, rangeF, parentF, '【ｲ.階別】')
      if (entryF === undefined || rangeF === undefined || headF === null) {
        unwritten.push({ fieldId: key, reason: '階別の行が見つからない' })
        continue
      }
      const floors = floorNumbersOf(values)
      const row = Math.max(...floors) - n
      // 行が足りないときは、一つも書かない（「各階の床面積は別紙」）
      if (floors.length > FLOOR_ROWS || row >= FLOOR_ROWS) {
        unwritten.push({ fieldId: key, reason: '行が足りない（各階の床面積は別紙）' })
        continue
      }
      const idx = headF + row
      if (idx >= rangeF[1] || bracketsOf(paragraphs[idx]!).length < 3) {
        unwritten.push({ fieldId: key, reason: '括弧が見つからない（階別の行）' })
        continue
      }
      const label = `${entryF.field.label}（階別）`
      const headingOfRow = row === 0 ? '【ｲ.階別】' : ''
      instructions.push({ fieldId: key, label, paragraphIndex: idx, kind: 'beforeUnit', heading: headingOfRow, unit: '階', value: String(n) })
      // 新築なので申請部分（1 番目）と合計（3 番目）に同じ値（統括の判断 2026-11-06）
      instructions.push({ fieldId: key, label, paragraphIndex: idx, kind: 'blanks', bracket: 0, value: v.value })
      instructions.push({ fieldId: key, label, paragraphIndex: idx, kind: 'blanks', bracket: 2, value: v.value })
      continue
    }
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
      // 細目は、後ろの見出し（inlineHeading）があればその名前で引く。段落の位置は見出し（heading）で探す
      const sub: TokyoSubitem | undefined = (t.subitems ?? []).find((s) => normOf(s.inlineHeading ?? s.heading) === normOf(route.sub!))
      if (sub === undefined) {
        unwritten.push({ fieldId: key, reason: `細目が対応表に無い（${route.sub}）` })
        continue
      }
      const idx = locateSubitemOf(paragraphs, range, parentIdx, sub.heading, sub.occurrence ?? 1)
      if (idx === null) {
        unwritten.push({ fieldId: key, reason: `細目の見出しが無い（${sub.heading}）` })
        continue
      }
      if (sub.inlineHeading !== undefined && sub.place !== 'afterHeading') {
        unwritten.push({ fieldId: key, reason: `入れ方が未対応（inlineHeading の細目は ${sub.place}）` })
        continue
      }
      const item =
        route.before !== undefined
          ? { kind: 'beforeUnit' as const, heading: sub.inlineHeading ?? sub.heading, unit: route.before }
          : placeOf(sub.place ?? '', sub.inlineHeading ?? sub.heading, route.bracket, sub.unit)
      if (item === null) {
        unwritten.push({ fieldId: key, reason: `入れ方が未対応（${sub.place}）` })
        continue
      }
      if (item.kind === 'beforeUnit' && !hasUnitAfter(paragraphs[idx]!, sub.heading, item.unit ?? '')) {
        unwritten.push({ fieldId: key, reason: `単位が無い（${item.unit ?? ''}）` })
        continue
      }
      if (item.kind === 'blanks' && bracketsOf(paragraphs[idx]!).length <= Math.max(item.bracket ?? 0, ...(route.brackets ?? []))) {
        unwritten.push({ fieldId: key, reason: `括弧が見つからない（${sub.heading}）` })
        continue
      }
      for (const x of expandOf(item, route.brackets)) instructions.push({ fieldId: key, label: entry.field.label, paragraphIndex: idx, ...x, value: v.value })
      continue
    }
    if (isDefault && t.place !== 'afterHeading') {
      unwritten.push({ fieldId: key, reason: `入れ方が未対応（${t.place}）` })
      continue
    }
    const item =
      route.before !== undefined ? { kind: 'beforeUnit' as const, heading: t.heading, unit: route.before } : placeOf(t.place, t.heading, route.bracket, t.unit)
    if (item === null) {
      unwritten.push({ fieldId: key, reason: `入れ方が未対応（${t.place}）` })
      continue
    }
    if (item.kind === 'beforeUnit' && !hasUnitAfter(paragraphs[parentIdx]!, t.heading, item.unit ?? '')) {
      unwritten.push({ fieldId: key, reason: `単位が無い（${item.unit ?? ''}）` })
      continue
    }
    if (item.kind === 'blanks' && bracketsOf(paragraphs[parentIdx]!).length <= Math.max(item.bracket ?? 0, ...(route?.brackets ?? []))) {
      unwritten.push({ fieldId: key, reason: `括弧が見つからない（${t.heading}）` })
      continue
    }
    if (item.kind === 'check' && !paragraphs[parentIdx]!.includes(`□${v.value}`)) {
      unwritten.push({ fieldId: key, reason: `□が無い（${v.value}）` })
      continue
    }
    for (const x of expandOf(item, route.brackets)) instructions.push({ fieldId: key, label: entry.field.label, paragraphIndex: parentIdx, ...x, value: v.value })
  }
  return { instructions, unwritten }
}

/** 括弧に入れる指示を、行き先の括弧の番号の数だけに広げる（申請部分と合計など）。括弧以外の指示はそのまま */
function expandOf<T extends { kind: string; bracket?: number }>(item: T, brackets: readonly number[] | undefined): T[] {
  if (item.kind !== 'blanks' || brackets === undefined) return [item]
  return brackets.map((b) => ({ ...item, bracket: b }))
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
  if (place === 'checkbox') return { kind: 'check', heading }
  return null
}

/** 見出しの後ろに単位があるか（見出しの中の同じ文字は数えない） */
function hasUnitAfter(text: string, heading: string, unit: string): boolean {
  const h = text.indexOf(heading)
  return h >= 0 && unit !== '' && text.indexOf(unit, h + heading.length) >= 0
}
