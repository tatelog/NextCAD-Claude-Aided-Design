// P3 平面（D-04 P3、D-02 C6、A-03 G17）。柱割りの通り芯と、廊下の両側の住戸候補から住戸数を出す。
// 区画の作り方は仮置き（candidateCells）。既定スパンと許容範囲は未決（D-02 C6）。画面では利用者が入れた値だけで計算する。
import { useMemo, useState } from 'react'
import { checkSpan, gridLines } from '../plan/grid'
import { candidateCells } from '../plan/candidateCells'
import { countUnits } from '../plan/units'
import { P3Canvas } from './P3Canvas'

export function P3Plan() {
  const [widthText, setWidthText] = useState('20000')
  const [depthText, setDepthText] = useState('12000')
  const [corridorText, setCorridorText] = useState('2000')
  const [unitDepthText, setUnitDepthText] = useState('6000')
  const [spanText, setSpanText] = useState('3000')
  const [minText, setMinText] = useState('')
  const [maxText, setMaxText] = useState('')
  const [layoutText, setLayoutText] = useState<'中廊下' | '片廊下'>('中廊下')
  const [targetText, setTargetText] = useState('')

  const lines = useMemo(() => {
    try {
      return gridLines(Number(depthText), Number(spanText))
    } catch {
      return null
    }
  }, [depthText, spanText])

  const units = useMemo(() => {
    try {
      const c = candidateCells({
        width_mm: Number(widthText),
        depth_mm: Number(depthText),
        corridor_mm: Number(corridorText),
        unit_depth_mm: Number(unitDepthText),
        span_mm: Number(spanText),
        layout: layoutText,
      })
      const W = Number(widthText)
      const D = Number(depthText)
      const r = countUnits({
        outline: [
          { x: 0, y: 0 },
          { x: W, y: 0 },
          { x: W, y: D },
          { x: 0, y: D },
        ],
        corridors: [c.corridor],
        cores: [],
        cells: c.cells,
      })
      return { cells: c, result: r, error: null as string | null }
    } catch (e) {
      return { cells: null, result: null, error: e instanceof Error ? e.message : String(e) }
    }
  }, [widthText, depthText, corridorText, unitDepthText, spanText, layoutText])

  const range = minText !== '' && maxText !== '' ? { minMm: Number(minText), maxMm: Number(maxText) } : null
  let judge: string = '許容範囲は未決（D-02 C6）'
  if (range && Number.isFinite(range.minMm) && Number.isFinite(range.maxMm)) {
    try {
      judge = checkSpan(Number(spanText), range)
    } catch {
      judge = '入力エラー'
    }
  }

  const W = Number(widthText)
  const D = Number(depthText)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', height: '100%' }}>
      <div style={{ padding: 16, overflow: 'auto' }}>
        {lines && units.cells ? (
          <svg width="100%" viewBox={`-500 -500 ${W + 1000} ${D + 1000}`} style={{ maxHeight: '70vh', background: '#fff', border: '1px solid #ddd8cc' }}>
            <rect x={0} y={0} width={W} height={D} fill="none" stroke="#1f2a44" strokeWidth={40} />
            <rect x={units.cells.corridor.x0} y={0} width={units.cells.corridor.x1 - units.cells.corridor.x0} height={D} fill="#eee" />
            {units.cells.cells.map((c) => (
              <rect key={c.id} x={c.x0} y={c.y0} width={c.x1 - c.x0} height={c.y1 - c.y0} fill="none" stroke="#8a8478" strokeWidth={20} />
            ))}
            {lines.map((y) => (
              <line key={y} x1={-200} y1={y} x2={W + 200} y2={y} stroke="#c44" strokeWidth={10} strokeDasharray="200 150" />
            ))}
          </svg>
        ) : (
          <p style={{ color: '#a33' }}>{units.error ?? '入力を確かめてください'}</p>
        )}
        <h3 style={{ fontSize: 14, margin: '12px 0 4px' }}>描く（ドラッグで直線。閉じた輪で部屋の閉合を見る）</h3>
        <P3Canvas />
      </div>
      <aside style={{ padding: 12, borderLeft: '1px solid #ddd8cc', background: '#fff', overflowY: 'auto' }}>
        <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>P3 平面（柱割り・住戸数）</h2>
        <label style={{ display: 'block', marginBottom: 4 }}>
          廊下タイプ
          <select value={layoutText} onChange={(e) => setLayoutText(e.target.value as '中廊下' | '片廊下')} style={{ width: '100%' }}>
            <option value="中廊下">中廊下</option>
            <option value="片廊下">片廊下</option>
          </select>
        </label>
        <label style={{ display: 'block', marginBottom: 6 }}>
          目標の戸数
          <input value={targetText} onChange={(e) => setTargetText(e.target.value)} placeholder="未入力" style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          建物の幅 (mm)
          <input value={widthText} onChange={(e) => setWidthText(e.target.value)} style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          建物の奥行 (mm)
          <input value={depthText} onChange={(e) => setDepthText(e.target.value)} style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          廊下の幅 (mm)
          <input value={corridorText} onChange={(e) => setCorridorText(e.target.value)} style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          住戸の奥行 (mm)
          <input value={unitDepthText} onChange={(e) => setUnitDepthText(e.target.value)} style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          スパン (mm)
          <input value={spanText} onChange={(e) => setSpanText(e.target.value)} style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          許容範囲 最小 (mm)
          <input value={minText} onChange={(e) => setMinText(e.target.value)} placeholder="未決" style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 10 }}>
          許容範囲 最大 (mm)
          <input value={maxText} onChange={(e) => setMaxText(e.target.value)} placeholder="未決" style={{ width: '100%' }} />
        </label>
        <p>スパンの判定: {judge}</p>
        {units.result ? (
          <>
            <p>
              住戸数（仮置きの区画）: <strong>{units.result.usable_count}</strong>
              {units.result.plan_status === '成立' ? '' : '（不成立のため確定しない）'}
            </p>
            <p style={{ color: '#666', fontSize: 12 }}>
              目標 {targetText === '' ? '未入力' : `${targetText} 戸`}
              {targetText !== '' && units.result.plan_status === '成立'
                ? `（差 ${units.result.usable_count - Number(targetText)} 戸）`
                : ''}
            </p>
            <p style={{ color: '#666', fontSize: 12 }}>
              区画の作り方は仮置き（廊下タイプに従い、柱割りの通りごとに並べる）。除外: {units.result.excluded.length} 件
            </p>
          </>
        ) : null}
        <p style={{ color: '#666', fontSize: 12 }}>閉合・意味判定（Worker）は画面に未接続。コアの枠は未入力（0 件）。</p>
      </aside>
    </div>
  )
}
