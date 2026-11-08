// 取り込んだ様式の欄の一覧（統括の依頼 2026-11-06。2-b）。欄ごとに、アプリが何をするか（入れる・人が入れる・行政が記入 など）を並べる。
// 表示だけの部品（値を受け取って描く）。記入は 2-c。
import type { PlanAction, PlanRow } from '../law/permitFormPlan'
import { AREA_REFERENCE_NOTE } from '../law/permitFormValues'

/** 欄の行動の文（一か所。言い換えはここだけ） */
export function actionTextOf(a: PlanAction): string {
  switch (a.kind) {
    case 'fill':
      // 公図の参考値（敷地面積）は、参考値の文を添える（統括の依頼 2026-11-06。3）
      return a.from === '公図の参考値' ? `入れる：${a.value}（${AREA_REFERENCE_NOTE}）` : `入れる：${a.value}（${a.from}）`
    case 'human':
      return '人が入れる（空欄）'
    case 'government':
      return '行政が記入（書かない）'
    case 'tableCell':
      return '表のセル（次の段で記入）'
    case 'notFound':
      return '見出しが無い（空欄の一覧へ）'
    case 'absent':
      return '東京都の版に無い'
  }
}

export interface PermitFormPlanViewProps {
  title: string
  rows: PlanRow[]
}

export function PermitFormPlanView({ title, rows }: PermitFormPlanViewProps) {
  const count = (k: PlanAction['kind']) => rows.filter((r) => r.action.kind === k).length
  const summary =
    `入れる ${count('fill')}・人が入れる ${count('human')}・行政が記入 ${count('government')}・` +
    `表のセル ${count('tableCell')}・見出しが無い ${count('notFound')}・版に無い ${count('absent')}`
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
      <p style={{ fontSize: 12, color: '#444', margin: '2px 0 4px' }}>{summary}</p>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
        <thead>
          <tr>
            <th align="left">面</th>
            <th align="left">欄</th>
            <th align="left">見出し</th>
            <th align="left">アプリがすること</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.face}</td>
              <td>{r.label}</td>
              <td>{r.heading}</td>
              <td>{actionTextOf(r.action)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
