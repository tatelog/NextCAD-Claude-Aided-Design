// 出力のビューア（1-a・1-c）。左に出す書類の一覧（判定の一覧・IFC、続けて要る・要確認・要らない）、右に選んだ項目の中身。判定の結果はそのまま使う。
import { useState } from 'react'
import type { PermitJudgement } from '../law/permitRequired'
import { applicabilityTextOf } from '../permit/p5Judgement'
import { fitSvgForView } from './fitSvgForView'
import { DRAWING_KEY_OF_NAME, DRAWING_MISSING_DEFAULT, FIXED_VIEWER_ITEMS, ifcSummaryOf, rowContentOf, viewerRowsOf, type ViewerGroup, type ViewerRow } from '../permit/permitViewer'
import type { FormKind } from '../law/permitFormKind'
import { previewPlanOf, type FilledFormFile } from './permitFormPreview'
import { DocxFormView } from './DocxFormView'

const GROUPS: readonly ViewerGroup[] = ['要る', '要確認', '要らない']
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
  judgement: PermitJudgement
  /** 書類の定義（名前と区分）。判定の名前を区分に当てるのに使う */
  docs: readonly { name: string; kind: string }[]
  /** IFC の文字。外形が閉じていなければ null */
  ifcText: string | null
  /** 配置図と各階平面図の中身（図枠つきの SVG）。作れないものは null */
  drawingSvgs?: { site: string | null; floorPlan: string | null }
  /** 作れない図の理由（図ごと）。無ければ既定の文 */
  drawingReasons?: { site: string; floorPlan: string }
  /** 要る図書の法的チェック（文と色）。無ければ出さない */
  checkOf?: (name: string) => { text: string; color: string } | null
  /** 最初に選ぶ項目の鍵（省略は判定の一覧） */
  initialKey?: string
  /** 記入した様式（第二号・第三号の docx）。あれば様式のまま描く。無ければ一覧のまま */
  filledForms?: Partial<Record<FormKind, FilledFormFile>>
}

export function PermitViewer({
  judgement,
  docs,
  ifcText,
  drawingSvgs = { site: null, floorPlan: null },
  drawingReasons = DRAWING_MISSING_DEFAULT,
  checkOf,
  initialKey = JUDGE_KEY,
  filledForms = {},
}: PermitViewerProps) {
  const rows = viewerRowsOf(judgement, docs)
  const [selected, setSelected] = useState(initialKey)
  const item = (key: string, label: string) => (
    <button key={key} type="button" aria-pressed={selected === key} onClick={() => setSelected(key)} style={itemStyle(selected === key)}>
      {label}
    </button>
  )
  const selectedRow = rows.find((r) => rowKeyOf(r) === selected)
  const count = (g: ViewerGroup) => rows.filter((r) => r.group === g).length

  let pane: React.ReactNode = null
  if (selected === JUDGE_KEY) {
    pane = (
      <>
        <h3 style={{ fontSize: 14, margin: '0 0 4px' }}>判定の一覧</h3>
        <p style={{ fontSize: 12, color: '#444' }}>{applicabilityTextOf(judgement)}</p>
        <p style={{ fontSize: 12, color: '#444' }}>{`要る ${count('要る')}・要確認 ${count('要確認')}・要らない ${count('要らない')}`}</p>
      </>
    )
  } else if (selected === IFC_KEY) {
    const s = ifcText === null ? null : ifcSummaryOf(ifcText)
    pane = (
      <>
        <h3 style={{ fontSize: 14, margin: '0 0 4px' }}>IFC（BIM のモデル）</h3>
        {s === null ? (
          <p style={{ fontSize: 12, color: '#a33' }}>ボリュームで外形を閉じると作れます。</p>
        ) : (
          <p style={{ fontSize: 12, color: '#444' }}>{`エンティティ ${s.entities} 件・容量 ${(s.bytes / 1024).toFixed(1)} KB`}</p>
        )}
      </>
    )
  } else if (selectedRow) {
    const check = selectedRow.group === '要る' && checkOf ? checkOf(selectedRow.name) : null
    const key = DRAWING_KEY_OF_NAME[selectedRow.name]
    const svg = key === undefined ? null : drawingSvgs[key]
    // 第二号・第三号は、記入した様式があれば様式のまま描く（統括の依頼 2026-11-06。代表承認）。描けなければ、一覧の文に戻す
    const docx = previewPlanOf(selectedRow.name, filledForms)
    const drawingBlock = key === undefined ? null : svg !== null ? (
      <div style={{ width: '100%' }} dangerouslySetInnerHTML={{ __html: fitSvgForView(svg) }} />
    ) : (
      <p style={{ fontSize: 12, color: '#a33' }}>{`${drawingReasons[key]}。`}</p>
    )
    pane = (
      <>
        <h3 style={{ fontSize: 14, margin: '0 0 4px' }}>{selectedRow.name}</h3>
        <p style={{ fontSize: 12, color: '#444', margin: '0 0 4px' }}>{`区分: ${selectedRow.group}`}</p>
        {selectedRow.reason ? <p style={{ fontSize: 12, color: '#666', margin: '0 0 4px' }}>{selectedRow.reason}</p> : null}
        {check ? <p style={{ fontSize: 12, color: check.color, margin: '0 0 4px' }}>{check.text}</p> : null}
        <p style={{ fontSize: 12, color: '#444' }}>{`中身: ${rowContentOf(selectedRow, filledForms)}`}</p>
        {docx.mode === 'docx' ? (
          <DocxFormView fileName={docx.fileName} bytes={docx.bytes} fallback={drawingBlock} />
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
        {item(JUDGE_KEY, JUDGE_KEY)}
        {item(IFC_KEY, IFC_KEY)}
        {GROUPS.map((g) => (
          <div key={g} style={{ marginTop: 8, display: 'grid', gap: 4 }}>
            <div style={{ fontSize: 12, color: '#666' }}>{`${g}（${count(g)}）`}</div>
            {rows.filter((r) => r.group === g).map((r) => item(rowKeyOf(r), r.name))}
          </div>
        ))}
      </nav>
      <div style={{ flex: 1, minWidth: 0 }}>{pane}</div>
    </div>
  )
}
