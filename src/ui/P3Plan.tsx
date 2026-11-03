// P3 平面（D-04 P3、D-02 C6、A-03 G17）。柱割りの通り芯と、廊下の両側の住戸候補から住戸数を出す。
// 区画の作り方は仮置き（candidateCells）。既定スパンと許容範囲は未決（D-02 C6）。画面では利用者が入れた値だけで計算する。
import { useMemo, useState } from 'react'
import { checkSpan, gridLines } from '../plan/grid'
import { candidateCells } from '../plan/candidateCells'
import { countUnits } from '../plan/units'
import { parseCoreRect, type CoreRectText } from '../plan/coreRect'
import { generateAutoPlan, type AutoPlan } from '../plan/autoPlan'
import { useSite } from '../store/site'
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
  const [coreText, setCoreText] = useState<CoreRectText>({ x0: '', y0: '', x1: '', y1: '' })
  const [storeysText, setStoreysText] = useState('5')
  const [storeyHeightText, setStoreyHeightText] = useState('3000')
  const [evCountText, setEvCountText] = useState('2')
  const [auto, setAuto] = useState<AutoPlan | null>(null)
  const [autoError, setAutoError] = useState<string | null>(null)

  // 目標の戸数から、スパン数と建物の寸法を決め、幅・奥行・スパンの入力に入れる（EV は全階停止として縦の数を出す）
  const runAuto = () => {
    try {
      const storeys = Number(storeysText)
      const g = generateAutoPlan({
        targetPerFloor: Number(targetText),
        storeyCount: storeys,
        storeyHeightMm: Number(storeyHeightText),
        spanMm: Number(spanText),
        unitDepthMm: Number(unitDepthText),
        corridorMm: Number(corridorText),
        layout: layoutText,
        evCount: Number(evCountText),
        evStops: Array.from({ length: storeys }, (_, i) => i + 1),
      })
      setWidthText(String(g.widthMm))
      setDepthText(String(g.depthMm))
      setAuto(g)
      useSite.getState().setPlan(g)
      setAutoError(null)
    } catch (e) {
      setAuto(null)
      setAutoError(e instanceof Error ? e.message : String(e))
    }
  }

  const lines = useMemo(() => {
    try {
      return gridLines(Number(depthText), Number(spanText))
    } catch {
      return null
    }
  }, [depthText, spanText])

  const core = parseCoreRect(coreText)

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
        cores: core.rect ? [core.rect] : [],
        cells: c.cells,
      })
      return { cells: c, result: r, error: null as string | null }
    } catch (e) {
      return { cells: null, result: null, error: e instanceof Error ? e.message : String(e) }
    }
  }, [widthText, depthText, corridorText, unitDepthText, spanText, layoutText, core.rect])

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
            {core.rect ? (
              <rect x={core.rect.x0} y={core.rect.y0} width={core.rect.x1 - core.rect.x0} height={core.rect.y1 - core.rect.y0} fill="#e6f2ed" stroke="#1f2a44" strokeWidth={20} />
            ) : null}
            {auto ? auto.cores.map((c) => (
              <rect key={c.id} x={c.x0} y={c.y0} width={c.x1 - c.x0} height={c.y1 - c.y0} fill={c.id === 'evHall' ? '#dfe9f5' : '#e6f2ed'} stroke="#1f2a44" strokeWidth={20} />
            )) : null}
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
        <fieldset style={{ border: '1px solid #ddd8cc', padding: 8, margin: '0 0 10px' }}>
          <legend style={{ fontSize: 12 }}>EV コアの矩形（任意・mm。四隅すべて入れると区画の除外判定に使う）</legend>
          {(['x0', 'y0', 'x1', 'y1'] as const).map((k) => (
            <label key={k} style={{ display: 'inline-block', width: '48%', marginBottom: 4, fontSize: 12 }}>
              {k}
              <input value={coreText[k]} onChange={(e) => setCoreText({ ...coreText, [k]: e.target.value })} style={{ width: '100%' }} />
            </label>
          ))}
          {core.error ? <p style={{ color: '#a33', fontSize: 12, margin: '4px 0 0' }}>{core.error}</p> : null}
        </fieldset>
        <fieldset style={{ border: '1px solid #ddd8cc', padding: 8, margin: '0 0 10px' }}>
          <legend style={{ fontSize: 12 }}>自動で作る（柱割り・間取り・縦シャフト）</legend>
          <label style={{ display: 'inline-block', width: '48%', marginBottom: 4, fontSize: 12 }}>
            階数
            <input value={storeysText} onChange={(e) => setStoreysText(e.target.value)} style={{ width: '100%' }} />
          </label>
          <label style={{ display: 'inline-block', width: '48%', marginBottom: 4, fontSize: 12 }}>
            階高 (mm)
            <input value={storeyHeightText} onChange={(e) => setStoreyHeightText(e.target.value)} style={{ width: '100%' }} />
          </label>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
            EV の基数（全階停止）
            <input value={evCountText} onChange={(e) => setEvCountText(e.target.value)} style={{ width: '100%' }} />
          </label>
          <button type="button" onClick={runAuto}>
            柱割り・間取り・縦シャフトを作る
          </button>
          {autoError ? <p style={{ color: '#a33', fontSize: 12, margin: '4px 0 0' }}>{autoError}</p> : null}
          {auto ? (
            <dl style={{ fontSize: 12, margin: '6px 0 0' }}>
              <dt>柱割り</dt>
              <dd>
                {auto.spans} スパン（幅 {auto.widthMm} mm × 奥行 {auto.depthMm} mm）
              </dd>
              <dt>住戸（1 階）</dt>
              <dd>
                {auto.unitsPerFloor} 戸{auto.shortfall > 0 ? `（目標に ${auto.shortfall} 戸足りない）` : '（目標を満たす）'}
              </dd>
              <dt>縦シャフト</dt>
              <dd>
                PS {auto.shafts.ps}（住戸ごと）・EPS {auto.shafts.eps}・DS {auto.shafts.ds}（コア脇、仮置き）
              </dd>
              <dt>EV</dt>
              <dd>
                {auto.ev.ev_cores.length} 基・全 {auto.ev.storeys.length} 階停止
                {auto.ev.unreachable_storeys.length > 0 ? `（停止しない階 ${auto.ev.unreachable_storeys.join(', ')}）` : ''}。配置: 階段 A・B は廊下の両端、EV ホールは中央（長さ 3 m の仮置き）
              </dd>
            </dl>
          ) : null}
        </fieldset>
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
        <p style={{ color: '#666', fontSize: 12 }}>
          閉合・意味判定（Worker）は画面に未接続。コアの枠: {core.rect ? '1 件（ev-1）を除外判定に使用' : '未入力（0 件）'}。
        </p>
      </aside>
    </div>
  )
}
