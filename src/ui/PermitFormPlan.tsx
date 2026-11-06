// 取り込んだ様式ごとに、欄の一覧（アプリが何をするか）を出す（統括の依頼 2026-11-06。2-b）。
// 対応表（permitForms.json の tokyo）と、取り込んだ段落と、アプリの値（formValuesFromVolume）から作る。決定論。
import permitFormsJson from '../law/permitForms.json'
import { FORM_KINDS, FORM_TITLE } from '../law/permitFormKind'
import { planRowsOf, type FormDef, type ValueMap } from '../law/permitFormPlan'
import { usePermitForms } from '../store/permitForms'
import { PermitFormPlanView } from './PermitFormPlanView'

const FORM_DEFS = (permitFormsJson as unknown as { forms: FormDef[] }).forms

export interface PermitFormPlanProps {
  /** アプリが欄に入れる値（欄の id → 値） */
  values: ValueMap
}

export function PermitFormPlan({ values }: PermitFormPlanProps) {
  const forms = usePermitForms((s) => s.forms)
  return (
    <>
      {FORM_KINDS.map((k) => {
        const f = forms[k]
        if (f === undefined) return null
        const def = FORM_DEFS.find((d) => d.id === k)
        if (def === undefined) {
          return <p key={k} style={{ fontSize: 12, color: '#a33' }}>{`${FORM_TITLE[k]}：対応表に無い（この様式の欄は、次の段で入れる）`}</p>
        }
        return <PermitFormPlanView key={k} title={`${FORM_TITLE[k]}（${f.fileName}）`} rows={planRowsOf(def, f.paragraphs, values)} />
      })}
    </>
  )
}
