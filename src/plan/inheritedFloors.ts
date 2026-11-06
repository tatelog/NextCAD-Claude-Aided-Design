import type { SiteVolume } from '../store/site'
import { cutFloors, type SlopeBoundary } from '../volume/slope'
export function inheritedFloors(volume: SiteVolume | null, boundaries: readonly SlopeBoundary[]) {
 if (!volume || volume.footprint.length < 3) return null
 const minX=Math.min(...volume.footprint.map(p=>p.x)), maxX=Math.max(...volume.footprint.map(p=>p.x))
 const minY=Math.min(...volume.footprint.map(p=>p.y)), maxY=Math.max(...volume.footprint.map(p=>p.y))
 return { origin:{x:minX,y:maxY}, widthMm:Math.ceil(maxX-minX), depthMm:Math.ceil(maxY-minY),
  floors:cutFloors(volume.footprint,boundaries,volume).map(f=>f.map(p=>({x:p.x-minX,y:maxY-p.y}))) }
}
