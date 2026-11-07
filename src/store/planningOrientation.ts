import { useConfirmedSite } from './confirmedSite'
import { useDrawing } from './drawing'
import { rebaseEntries } from '../canvas/outlineEdit'
import { alignEdgeAngle, withPlanningAngle } from '../map/planningFrame'

export function setPlanningOrientation(degrees: number, edge: number) {
  const site = useConfirmedSite.getState().confirmed
  if (!site?.lot || !site.frame || !Number.isFinite(degrees)) return
  const delta = degrees - (site.frame.rotationDeg ?? 0)
  // 座標系変更は編集履歴全体に適用し、Undo でも旧座標へ戻らない。
  const rebase = (entries: ReturnType<typeof useDrawing.getState>['entries']) =>
    entries.map(e => e.screen === 'P3' ? e : rebaseEntries([e], delta)[0]!)
  useDrawing.setState(s => ({ entries: rebase(s.entries), past: s.past.map(rebase), redoStack: s.redoStack.map(rebase) }))
  useConfirmedSite.getState().confirm({ ...withPlanningAngle(site, degrees), planningEdge: edge })
}

export function alignPlanningEdge(edge: number) {
  const site = useConfirmedSite.getState().confirmed
  if (!site?.lot || !site.frame) return
  const degrees = (site.frame.rotationDeg ?? 0) + alignEdgeAngle(site.lot, edge)
  useConfirmedSite.getState().setRoadEdge(edge)
  setPlanningOrientation(degrees, edge)
}
