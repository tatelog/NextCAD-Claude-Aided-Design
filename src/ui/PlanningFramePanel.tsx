import type { ConfirmedSite } from '../store/confirmedSite'
import { alignPlanningEdge, setPlanningOrientation } from '../store/planningOrientation'

export function PlanningFramePanel({ site, onSelect }: { site: ConfirmedSite | null; onSelect: () => void }) {
  if (!site?.lot || !site.frame) return null
  const edge = site.planningEdge ?? site.roadEdge
  const angle = site.frame.rotationDeg ?? 0
  return <section aria-label="敷地の基準面" style={{ marginBottom: 12 }}>
    <h2>敷地の基準面</h2>
    <button type="button" onClick={onSelect}>道路番号を選んで向きを合わせる</button>
    <label>基準の境界線<select value={edge} onChange={e => alignPlanningEdge(Number(e.target.value))}>
      {site.lot.map((_, i) => <option key={i} value={i}>{i}</option>)}
    </select></label>
    <label>回転角度（°）<input type="number" step="1" value={angle} onChange={e => { if (e.target.value !== '') setPlanningOrientation(Number(e.target.value), edge) }} /></label>
    <button type="button" onClick={() => setPlanningOrientation(angle + 90, edge)}>90°回転</button>
    <p className="muted">{site.planningEdge != null ? `基準辺 ${edge}・確定済み` : '道路番号をクリックすると基準方向を確定します。'}</p>
  </section>
}
