import { useDrawing } from './drawing'
import { useSelection } from './selection'
import { useLayers } from './layers'
import { useSemantic } from './semantic'
import { layerOfSegment } from '../plan/layers'

export function deleteSelectedSegments() {
  const selected = new Set(useSelection.getState().segmentIds)
  const drawing = useDrawing.getState()
  const locked = useLayers.getState().locked
  const assignments = useSemantic.getState().assignments
  const removable = new Set(drawing.entries.flatMap(e=>e.segments).filter(s=>selected.has(s.id) && !locked[layerOfSegment(s.stage, assignments[s.id]?.kind ?? null)]).map(s=>s.id))
  if (!removable.size) return
  drawing.transform(entries => {
    const nodes = entries.flatMap(e=>e.nodes)
    return entries.map(e => {
    const segments = e.segments.filter(s=>!removable.has(s.id))
    const used = new Set(segments.flatMap(s=>[s.start_node_id,s.end_node_id]))
    return {...e,nodes:nodes.filter(n=>used.has(n.id)),segments,stroke:{...e.stroke,segment_ids:segments.map(s=>s.id)}}
    }).filter(e=>e.segments.length)
  })
  useSelection.getState().setSegmentIds([...selected].filter(id=>!removable.has(id)))
}
