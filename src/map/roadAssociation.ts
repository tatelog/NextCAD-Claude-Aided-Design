import { z } from 'zod'
import type { Point } from '../geom/viewport'
import { outwardNormal } from '../law/frontRoad'
import { planeOfLonLat, type ParcelFrame } from './parcelPlane'
import type { RoadRecord } from '../prep/convert'
import { ROAD_WIDTH_CLASSES } from './roadStyle'
import { ROAD_WIDTH_SOURCES } from '../volume/roadWidthSource'
export const ROAD_DATA_SOURCE = 'https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N13-2024.html'
export const RoadLinkSchema = z.object({
 edgeIndex:z.number().int().min(0),edgeLengthMm:z.number().nonnegative(),
 status:z.enum(['candidate','multiple','none','unavailable']),
 candidates:z.array(z.object({roadId:z.string(),widthClass:z.number(),widthLabel:z.string(),roadClass:z.number(),roadState:z.number(),distanceMm:z.number().nonnegative(),overlapMm:z.number().nonnegative(),source:z.string()})),
 adoptedWidthMm:z.number().positive().nullable(),adoptedSource:z.enum(ROAD_WIDTH_SOURCES).optional(),
})
export type RoadLink=z.infer<typeof RoadLinkSchema>
/** N13は中心線。位置精度と幅員区分を考慮した候補照合であり、法的接道の確定ではない。 */
export function associateRoads(lot:readonly Point[],frame:ParcelFrame,roads:readonly RoadRecord[]|null):RoadLink[] {
 const minX=Math.min(...lot.map(p=>p.x))-50000,maxX=Math.max(...lot.map(p=>p.x))+50000
 const minY=Math.min(...lot.map(p=>p.y))-50000,maxY=Math.max(...lot.map(p=>p.y))+50000
 const projected=roads?.map((r,index)=>({r,index,lines:(Array.isArray(r.g[0]?.[0]) ? r.g as [number,number][][] : [r.g as [number,number][]]).map(line=>line.map(([lon,lat])=>planeOfLonLat(frame,lon,lat)))})).filter(({lines})=>lines.some(line=>line.some((p,i)=>{const q=line[i+1];return q && Math.max(p.x,q.x)>=minX && Math.min(p.x,q.x)<=maxX && Math.max(p.y,q.y)>=minY && Math.min(p.y,q.y)<=maxY})))
 return lot.map((a,edgeIndex)=>{
  const b=lot[(edgeIndex+1)%lot.length]!, length=Math.hypot(b.x-a.x,b.y-a.y)
  const candidates:RoadLink['candidates']=[]
  if(length>0 && projected) {
   const t={x:(b.x-a.x)/length,y:(b.y-a.y)/length}, out=outwardNormal(lot,edgeIndex)
   for(const {r,index,lines} of projected) {
    // 高架・トンネル・建設中・高速道路を地上の接道候補にしない。
    if(r.s!==1 || r.c===4) continue
    let best:{distanceMm:number;overlapMm:number}|null=null
    const maxDistance=([0,1500,2750,6500,9750,20000,20000][r.w]??20000)+25000
    for(const line of lines) for(let j=0;j<line.length-1;j++) {
     const p=line[j]!,q=line[j+1]!,dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy)
     if(!len || Math.abs((dx*t.x+dy*t.y)/len)<0.85) continue
     const u=(p.x-a.x)*t.x+(p.y-a.y)*t.y,v=(q.x-a.x)*t.x+(q.y-a.y)*t.y
     const lo=Math.max(0,Math.min(u,v)),hi=Math.min(length,Math.max(u,v)),overlap=hi-lo
     if(overlap<Math.min(length*0.25,3000)) continue
     const d0=(p.x-a.x)*out.x+(p.y-a.y)*out.y,d1=(q.x-a.x)*out.x+(q.y-a.y)*out.y
     const at=(s:number)=>d0+(d1-d0)*(s-u)/(v-u)
     const left=at(lo),right=at(hi),distance=(left+right)/2
     if(Math.min(left,right)<0 || distance>maxDistance) continue
     if(!best || distance<best.distanceMm) best={distanceMm:Math.round(distance),overlapMm:Math.round(overlap)}
    }
    if(best) candidates.push({roadId:`N13-${index}`,widthClass:r.w,widthLabel:ROAD_WIDTH_CLASSES.find(w=>w.k===r.w)?.label??'幅員不明',roadClass:r.c,roadState:r.s,...best,source:ROAD_DATA_SOURCE})
   }
  }
  candidates.sort((a,b)=>a.distanceMm-b.distanceMm||b.overlapMm-a.overlapMm)
  return {edgeIndex,edgeLengthMm:Math.round(length),candidates,status:roads===null?'unavailable':candidates.length>1?'multiple':candidates.length?'candidate':'none',adoptedWidthMm:null}
 })
}
export function roadLinkText(link:RoadLink):string {
 if(link.status==='unavailable') return '道路データ未取得'
 if(!link.candidates.length) return '照合範囲内に候補なし（接道なしの確定ではありません）'
 const widths=[...new Set(link.candidates.map(c=>c.widthLabel))].join(' / ')
 return `${link.candidates.length>1?'複数候補':'道路候補'}：${widths}（正確な幅員は未確定）`
}
