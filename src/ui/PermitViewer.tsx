import {usePermitForms} from '../store/permitForms'
import {informationFields} from '../permit/permitTextCsv'
import {candidateOf,documentCandidates} from '../permit/documentCandidates'
// 出力のビューア（1-a・1-c）。左に出す書類の一覧（判定の一覧・IFC、続けて要る・要確認・要らない）、右に選んだ項目の中身。判定の結果はそのまま使う。
import { useState } from 'react'
import permitFormsJson from '../law/permitForms.json'
import { planRowsOf, type FormDef, type ValueMap } from '../law/permitFormPlan'
import { PermitFormPlanView } from './PermitFormPlanView'
import { docxViewKindOfName } from './permitFormPreview'
import type { PermitJudgement } from '../law/permitRequired'
import { fitSvgForView } from './fitSvgForView'
import { DRAWING_KEY_OF_NAME, DRAWING_MISSING_DEFAULT, FIXED_VIEWER_ITEMS, ifcSummaryOf, rowContentOf, viewerRowsOf, type ViewerRow } from '../permit/permitViewer'
import type { FormKind } from '../law/permitFormKind'
import { previewPlanOf, type FilledFormFile } from './permitFormPreview'
import { DocxFormView } from './DocxFormView'

const GROUPS = ['作成可能', '追加の情報が必要', '作成候補（未実装）', '本システムで出力できないもの'] as const
const JUDGE_KEY: string = FIXED_VIEWER_ITEMS[0]
const IFC_KEY: string = FIXED_VIEWER_ITEMS[1]
const rowKeyOf = (r: ViewerRow): string => `${r.group}|${r.name}`

const itemStyle = (on: boolean) => ({
  textAlign: 'left' as const,
  padding: '4px 8px',
  border: '1px solid #b8b2a4',
  borderRadius: 6,
  background: on ? '#1f2a44' : '#fff',
  color: on ? '#fff' : '#1f2a44',
  font: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
})

export interface PermitViewerProps {
  judgement: PermitJudgement | null
  /** 書類の定義（名前と区分）。判定の名前を区分に当てるのに使う */
  docs: readonly { name: string; kind: string }[]
  /** IFC の文字。外形が閉じていなければ null */
  ifcText: string | null
  ifcReady?: boolean
  ifcSchema?: string
  /** 配置図と各階平面図の中身（図枠つきの SVG）。作れないものは null */
  drawingSvgs?: { site: string | null; floorPlan: string | null; shadow?: string | null; vicinity?:string|null; floorArea?:string|null }
  /** 作れない図の理由（図ごと）。無ければ既定の文 */
  drawingReasons?: { site: string; floorPlan: string; shadow?: string; vicinity?:string; floorArea?:string }
  /** 要る図書の法的チェック（文と色）。無ければ出さない */
  checkOf?: (name: string) => { text: string; color: string } | null
  /** 最初に選ぶ項目の鍵（省略は判定の一覧） */
  initialKey?: string
  /** 記入した様式（第二号・第三号の docx）。あれば様式のまま描く。無ければ一覧のまま */
  formValues?: ValueMap
  importedForms?: Partial<Record<FormKind, { paragraphs: string[] }>>
  filledForms?: Partial<Record<FormKind, FilledFormFile>>
}

export function PermitViewer({
  judgement,
  docs,
  ifcText,
  ifcReady=false,
  ifcSchema='IFC4',
  drawingSvgs = { site: null, floorPlan: null },
  drawingReasons = DRAWING_MISSING_DEFAULT,
  checkOf,
  initialKey,
  filledForms = {},
  formValues = {},
  importedForms = {},
}: PermitViewerProps) {
  const actualFilled=usePermitForms(s=>s.filled)
  const rows: ViewerRow[] = judgement ? viewerRowsOf(judgement, docs) : docs.filter(d => docxViewKindOfName(d.name)).map(d => ({ name: d.name, group: '要確認', reason: null, content: '申請様式' }))
  for(const name of [...Object.keys(DRAWING_KEY_OF_NAME),...documentCandidates.map(c=>c.name)]){
    if(!rows.some(r=>r.name===name))rows.push({name,group:'要確認',reason:null,content:'図書'})
  }
  const [selected, setSelected] = useState(initialKey && initialKey !== JUDGE_KEY ? initialKey : rows[0] ? rowKeyOf(rows[0]) : IFC_KEY)
  const statusOf=(label:string):'作成済み'|'出力対応・未作成'|'自動出力対象外'|'作成候補（未実装）'|null=>{
    if(label===JUDGE_KEY)return null
    if(label===IFC_KEY)return ifcText?'作成済み':'出力対応・未作成'
    const kind=docxViewKindOfName(label)
    if(kind)return filledForms[kind]?'作成済み':'出力対応・未作成'
    const drawing=DRAWING_KEY_OF_NAME[label]
    if(drawing)return drawingSvgs[drawing]?'作成済み':'出力対応・未作成'
    return candidateOf(label)?'作成候補（未実装）':'自動出力対象外'
  }
  const item = (key: string, label: string) => {
    const status=statusOf(label)
    return <button key={key} type="button" aria-label={label} aria-description={status??undefined} aria-pressed={selected === key} onClick={() => setSelected(key)} style={{...itemStyle(selected === key),display:'flex',alignItems:'center',gap:8}}>
      {status&&<span aria-hidden="true" title={status} style={{width:16,flexShrink:0,textAlign:'center',color:selected===key?'#fff':status==='作成済み'?'#26734b':'#64748b'}}>{status==='作成済み'?'●':status==='出力対応・未作成'?'○':status==='作成候補（未実装）'?'△':'—'}</span>}
      <span>{label}</span>
    </button>
  }
  const selectedRow = rows.find((r) => rowKeyOf(r) === selected)
  const groupOf=(name:string):typeof GROUPS[number]=>{
    const status=statusOf(name)
    if(name===IFC_KEY&&ifcReady)return '作成可能'
    if(status==='作成済み')return '作成可能'
    if(status==='出力対応・未作成')return '追加の情報が必要'
    if(status==='作成候補（未実装）')return '作成候補（未実装）'
    return '本システムで出力できないもの'
  }
  const count=(g:typeof GROUPS[number])=>rows.filter(r=>groupOf(r.name)===g).length+(groupOf(IFC_KEY)===g?1:0)

  let pane: React.ReactNode = null
  if (selected === IFC_KEY) {
    const s = ifcText === null ? null : ifcSummaryOf(ifcText)
    pane = (
      <>
        <h3 style={{ fontSize: 14, margin: '0 0 4px' }}>IFC（BIM のモデル）</h3>
        {s === null ? (
          <p style={{ fontSize: 12, color: '#a33' }}>{ifcReady?`保存済みの平面から ${ifcSchema} を生成できます。一括保存時にIFCファイルを作成します。`:'平面を作成・保存するとIFCを出力できます。'}</p>
        ) : (
          <p style={{ fontSize: 12, color: '#444' }}>{`エンティティ ${s.entities} 件・容量 ${(s.bytes / 1024).toFixed(1)} KB`}</p>
        )}
      </>
    )
  } else if (selectedRow) {
    const check = selectedRow.group === '要る' && checkOf ? checkOf(selectedRow.name) : null
    const key = DRAWING_KEY_OF_NAME[selectedRow.name]
    const svg = key === undefined ? null : (drawingSvgs[key]??null)
    // 第二号・第三号は、記入した様式があれば様式のまま描く（統括の依頼 2026-11-06。代表承認）。描けなければ、一覧の文に戻す
    const formKind = docxViewKindOfName(selectedRow.name)
    const definition = (permitFormsJson.forms as unknown as FormDef[]).find(f => f.id === formKind)
    const imported = formKind ? importedForms[formKind] : undefined
    const docx = previewPlanOf(selectedRow.name, filledForms)
    const report=formKind?actualFilled[formKind]?.report:undefined
    const fields=informationFields.filter(f=>f.form===formKind)
    const matches=(id:string,f:typeof fields[number])=>id===f.id||(f.id.endsWith('.INFO')&&(id===f.field||id.startsWith(f.field+'.')))
    const written=fields.filter(f=>report?.writtenIds.some(id=>matches(id,f)))
    const samples=written.filter(f=>report?.sampleIds.some(id=>matches(id,f)))
    const missing=fields.filter(f=>!written.includes(f))
    const drawingBlock = key === undefined ? null : svg !== null ? (
      <div style={{ width: '100%' }} dangerouslySetInnerHTML={{ __html: fitSvgForView(svg) }} />
    ) : (
      <p style={{ fontSize: 12, color: '#a33' }}>{`${drawingReasons[key]??"元データが未作成です"}。`}</p>
    )
    pane = (
      <>
        <h3 style={{ fontSize: 14, margin: '0 0 4px' }}>{selectedRow.name}</h3>
        <p style={{ fontSize: 12, color: '#444', margin: '0 0 4px' }}>{`状態: ${groupOf(selectedRow.name)}`}</p>
        {selectedRow.reason ? <p style={{ fontSize: 12, color: '#666', margin: '0 0 4px' }}>{selectedRow.reason}</p> : null}
        {check ? <p style={{ fontSize: 12, color: check.color, margin: '0 0 4px' }}>{check.text}</p> : null}
        <p style={{ fontSize: 12, color: '#444' }}>{`中身: ${rowContentOf(selectedRow, filledForms)}`}</p>
        {candidateOf(selectedRow.name)&&<div role="note"><strong>作成候補（現在は表示・出力未対応）</strong><p>利用できる情報：{candidateOf(selectedRow.name)!.basis}</p><p>必要な設定・実装：{candidateOf(selectedRow.name)!.needs}</p></div>}
        {formKind&&report&&<section aria-label="Wordへの転記状況" style={{padding:10,background:'#f7f9fc',border:'1px solid #cbd6e5',borderRadius:6,marginBottom:10}}>
          <strong>Wordへの転記あり {written.length}項目／対象 {fields.length}項目</strong>
          <p style={{fontSize:12,margin:'6px 0'}}>うちサンプル {samples.length}項目・未転記 {missing.length}項目</p>
          <p style={{fontSize:12,margin:'6px 0'}}>実際に生成したWordの転記記録です。複合項目は一部の細目だけの転記を含み、申請書の完成率ではありません。</p>
          <details><summary>未転記の項目</summary><ul>{missing.map(f=><li key={f.id}>{f.face}・{f.label}：{f.id.endsWith('.INFO')?'一覧用情報・転記未対応':formValues[f.id]?.value?'転記先が未対応・見出し不一致':'入力なし'}</li>)}</ul></details>
          {!!report.unwritten.length&&<details><summary>転記できなかった内容</summary><ul>{report.unwritten.map((r,i)=><li key={i}>{r.fieldId}：{r.reason}</li>)}</ul></details>}
        </section>}
        {docx.mode === 'docx' ? (
          <>
            {docx.fileName.startsWith('tutorial-') && <p>練習用の抜粋です。正式な申請には使用できません。</p>}
            <DocxFormView fileName={docx.fileName} bytes={docx.bytes} fallback={drawingBlock} />
            {definition && imported && <PermitFormPlanView title="記入箇所と記入する値" rows={planRowsOf(definition, imported.paragraphs, formValues)} />}
          </>
        ) : (
          <>
            {docx.reason ? <p style={{ fontSize: 12, color: '#666' }}>{docx.reason}</p> : null}
            {drawingBlock}
          </>
        )}
      </>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <nav aria-label="出す書類の一覧" style={{ flex: '0 0 260px', display: 'grid', gap: 4 }}>
        {GROUPS.map((g) => (
          <section key={g} aria-label={g} style={{ marginTop: 8, display: 'grid', gap: 4 }}>
            <div style={{ fontSize: 12, color: '#666' }}>{`${g}（${count(g)}）`}</div>
            {groupOf(IFC_KEY)===g&&item(IFC_KEY,IFC_KEY)}
            {rows.filter((r) => groupOf(r.name) === g).map((r) => item(rowKeyOf(r), r.name))}
          </section>
        ))}
      </nav>
      <div style={{ flex: 1, minWidth: 0 }}>{pane}</div>
    </div>
  )
}
