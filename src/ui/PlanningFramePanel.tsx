import { useState } from 'react'
import { alignEdgeAngle, withPlanningAngle } from '../map/planningFrame'
import { useConfirmedSite, type ConfirmedSite } from '../store/confirmedSite'

export function PlanningFramePanel({ site, locked, onPreview }: {
  site: ConfirmedSite | null; locked: boolean; onPreview: (site: ConfirmedSite | null) => void
}) {
  const [edge, setEdge] = useState(site?.planningEdge ?? (site?.lot && site.lot.length > 7 ? 7 : 0))
  const [angle, setAngle] = useState(site?.frame?.rotationDeg ?? 0)
  const [preview, setPreview] = useState(false)
  if (!site?.lot || !site.frame) return null
  const show = (degrees: number, nextEdge = edge) => {
    setAngle(degrees)
    setPreview(true)
    onPreview({ ...withPlanningAngle(site, degrees), planningEdge: nextEdge })
  }
  return <section aria-label="敷地の基準面" style={{ marginBottom: 12 }}>
    <h2>敷地の基準面</h2>
    <label>基準の境界線<select value={edge} disabled={locked} onChange={(e) => {
      const next = Number(e.target.value)
      setEdge(next)
      show((site.frame?.rotationDeg ?? 0) + alignEdgeAngle(site.lot!, next), next)
    }}>{site.lot.map((_, i) => <option key={i} value={i}>{i}</option>)}</select></label>
    <button type="button" disabled={locked} onClick={() => show((site.frame?.rotationDeg ?? 0) + alignEdgeAngle(site.lot!, edge))}>選んだ辺を水平にする</button>
    <label>回転角度（°）<input type="number" step="1" value={angle} disabled={locked} onChange={(e) => { if (e.target.value !== '') show(Number(e.target.value)) }} /></label>
    <div style={{ display: 'flex', gap: 6 }}>
      <button type="button" disabled={locked} onClick={() => show(angle + 90)}>90°回転</button>
      <button type="button" disabled={locked || !preview} onClick={() => {
        useConfirmedSite.getState().confirm({ ...withPlanningAngle(site, angle), planningEdge: edge })
        setPreview(false); onPreview(null)
      }}>基準面を確定</button>
      {preview && <button type="button" onClick={() => { setAngle(site.frame?.rotationDeg ?? 0); setPreview(false); onPreview(null) }}>取消</button>}
    </div>
    {locked ? <p className="muted">基準面の変更は作図前に行います。</p> : <p className="muted">{preview ? '回転をプレビュー中' : site.planningEdge != null ? `基準辺 ${site.planningEdge}・確定済み` : '基準辺を選び、向きを確認して確定'}</p>}
  </section>
}
