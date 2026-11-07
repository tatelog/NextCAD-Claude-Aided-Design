import type { SiteVolume } from '../store/site'
import { cutFloorParts, type SlopeBoundary } from '../volume/slope'
export function inheritedFloors(volume: SiteVolume | null, boundaries: readonly SlopeBoundary[]) {
 if (!volume || volume.footprint.length < 3) return null
 const minX=Math.min(...volume.footprint.map(p=>p.x)), maxX=Math.max(...volume.footprint.map(p=>p.x))
 const minY=Math.min(...volume.footprint.map(p=>p.y)), maxY=Math.max(...volume.footprint.map(p=>p.y))
 const parts=cutFloorParts(volume.footprint,boundaries,volume)
 return { splitFloors:parts.flatMap((ps,i)=>ps.length>1?[i+1]:[]), origin:{x:minX,y:maxY}, widthMm:Math.ceil(maxX-minX), depthMm:Math.ceil(maxY-minY),
  floors:parts.map(ps=>(ps.length===1?ps[0]!:[]).map(p=>({x:p.x-minX,y:maxY-p.y}))) }
}
