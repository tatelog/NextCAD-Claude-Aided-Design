// 取り込んだ様式ごとに、欄の一覧（アプリが何をするか）を出す（統括の依頼 2026-11-06。2-b）。
// 対応表（permitForms.json の tokyo）と、取り込んだ段落と、アプリの値（formValuesFromVolume）から作る。決定論。
import { useEffect, useState } from 'react'
import permitFormsJson from '../law/permitForms.json'
import { FORM_KINDS, FORM_TITLE, type FormKind } from '../law/permitFormKind'
import { planRowsOf, type FormDef, type ValueMap } from '../law/permitFormPlan'
import { fillInstructionsOf } from '../law/permitFormFill'
import { fillDocx } from '../export/docxWrite'
import { usePermitForms } from '../store/permitForms'
import { PermitFormPlanView } from './PermitFormPlanView'

const FORM_DEFS = (permitFormsJson as unknown as { forms: FormDef[] }).forms

export interface PermitFormPlanProps {
  /** アプリが欄に入れる値（欄の id → 値） */
  values: ValueMap
}

export function PermitFormPlan({ values }: PermitFormPlanProps) {
  const forms = usePermitForms((s) => s.forms)
  const filled = usePermitForms((s) => s.filled)
  const [notes, setNotes] = useState<Partial<Record<FormKind, string>>>({})

  // 欄に値を入れて、記入した docx を作る（記入済みの置き場に入れ、一式の 01_申請書 に入る）
  useEffect(() => {
  let cancelled = false
  const fill = async (k: FormKind, def: FormDef) => {
    const f = forms[k]
    if (f === undefined) return
    usePermitForms.getState().clearFilled(k)
    try {
      // この様式の欄の値だけを渡す（欄の id の先頭が様式の ID：F2-…）
      const own = Object.fromEntries(Object.entries(values).filter(([key]) => key.startsWith(`${def.id}-`) && !key.endsWith('.INFO')))
      const plan = fillInstructionsOf(def, f.paragraphs, own)
      const bytes = await fillDocx(f.bytes, plan.instructions)
      if (cancelled) return
      usePermitForms.getState().setFilled(k, `${f.fileName.replace(/\.docx$/i, '')}_記入.docx`, bytes, {writtenIds:[...new Set(plan.instructions.map(i=>i.fieldId))],sampleIds:[...new Set(plan.instructions.filter(i=>own[i.fieldId]?.from.includes('サンプル')).map(i=>i.fieldId))],unwritten:plan.unwritten})
      const left = plan.unwritten.slice(0, 4).map((u) => `${u.fieldId}：${u.reason}`).join('、')
      setNotes((n) => ({
        ...n,
        [k]: `記入した欄 ${plan.instructions.length}・書かなかった欄 ${plan.unwritten.length}${left === '' ? '' : `（${left}…）`}`,
      }))
    } catch (e) {
      if (cancelled) return
      setNotes((n) => ({ ...n, [k]: `記入できませんでした（${e instanceof Error ? e.message : String(e)}）` }))
    }
  }

  for (const k of FORM_KINDS) {
    const def = FORM_DEFS.find((d) => d.id === k)
    if (def && forms[k]) void fill(k, def)
  }
  return () => { cancelled = true }
  }, [forms, values])

  return (
    <>
      {FORM_KINDS.map((k) => {
        const f = forms[k]
        if (f === undefined) return null
        const def = FORM_DEFS.find((d) => d.id === k)
        if (def === undefined) {
          return <p key={k} style={{ fontSize: 12, color: '#a33' }}>{`${FORM_TITLE[k]}：対応表に無い（この様式の欄は、次の段で入れる）`}</p>
        }
        const mine = filled[k]
        return (
          <div key={k}>
            <PermitFormPlanView title={`${FORM_TITLE[k]}（${f.fileName}）`} rows={planRowsOf(def, f.paragraphs, values)} />

            {mine ? <p style={{ fontSize: 12, color: '#444', margin: '4px 0 0' }}>{`記入済み：${mine.fileName}（一式の 01_申請書 に入ります）`}</p> : null}
            {notes[k] ? <p style={{ fontSize: 12, color: '#666', margin: '2px 0 0' }}>{notes[k]}</p> : null}
          </div>
        )
      })}
    </>
  )
}
