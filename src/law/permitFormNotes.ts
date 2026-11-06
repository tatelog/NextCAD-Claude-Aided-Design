// 書けなかった欄を、空欄の一覧の行にする（統括の依頼 2026-11-06。黙って抜けない）。取り込んだ様式の段落と値から、決定論で作る。
import permitFormsJson from './permitForms.json'
import { FORM_KINDS, FORM_TITLE, type FormKind } from './permitFormKind'
import { fillInstructionsOf } from './permitFormFill'
import type { FormDef, ValueMap } from './permitFormPlan'

const FORM_DEFS = (permitFormsJson as unknown as { forms: FormDef[] }).forms

/** 欄の表示の名前（欄の名前。細目は「（細目）」を足す）。欄が対応表に無ければ欄の id */
function labelOf(def: FormDef, key: string): string {
  const dot = key.indexOf('.')
  const fieldId = dot < 0 ? key : key.slice(0, dot)
  const sub = dot < 0 ? null : key.slice(dot + 1)
  const field = def.faces.flatMap((f) => f.fields).find((x) => x.id === fieldId)
  const base = field?.label ?? fieldId
  return sub === null ? base : `${base}（${sub}）`
}

/** 取り込んだ様式ごとに、書けなかった欄の行（欄の名前・様式・理由）を作る。書けた欄は出さない */
export function unwrittenNotesOf(forms: Partial<Record<FormKind, { paragraphs: readonly string[] }>>, values: ValueMap): string[] {
  const lines: string[] = []
  for (const k of FORM_KINDS) {
    const f = forms[k]
    const def = FORM_DEFS.find((d) => d.id === k)
    if (f === undefined || def === undefined) continue
    const own = Object.fromEntries(Object.entries(values).filter(([key]) => key.startsWith(`${def.id}-`)))
    const plan = fillInstructionsOf(def, f.paragraphs, own)
    for (const u of plan.unwritten) lines.push(`${labelOf(def, u.fieldId)}（${FORM_TITLE[k]}）：書けなかった（${u.reason}）`)
  }
  return lines
}
