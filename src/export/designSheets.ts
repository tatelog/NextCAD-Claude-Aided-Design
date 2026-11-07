import {CirculationLayer} from '../ui/CirculationLayer'
import {corridorForCell} from '../plan/planCorridors'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import type {AutoPlan} from '../plan/autoPlan'
import {UnitPlanDrawing} from '../ui/UnitPlanDrawing'
import {chooseScaleOf,scaledTransformOf} from './drawingSvg'
import {sunShadowsOf,winterSunAt} from '../volume/sunShadow'
type Pt={x:number;y:number}
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!))
const sheet=(title:string,body:string)=>`<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 420 297"><rect width="420" height="297" fill="white"/><text x="12" y="12" font-size="5">${esc(title)}</text>${body}</svg>`
export function detailedFloorSvg(p:AutoPlan,floor:number):string|null{
 if(!p.cells.length)return null
 const scale=chooseScaleOf(p.widthMm,p.depthMm,{x0:15,y0:25,x1:405,y1:267});if(!scale)return null
 const rooms=p.cells.map(cell=>renderToStaticMarkup(createElement(UnitPlanDrawing,{cell,corridor:corridorForCell(p,cell),typeId:p.unitTypeIdsByCell?.[cell.id]??'',variant:p.unitPlanVariants?.[cell.id]??'A',override:p.unitPlanOverrides?.[cell.id]}))).join('')
 const rect=(r:{x0:number;y0:number;x1:number;y1:number})=>`<rect x="${r.x0}" y="${r.y0}" width="${r.x1-r.x0}" height="${r.y1-r.y0}" fill="#eef0f1" stroke="#333" stroke-width="30"/>`
 const body=`<g transform="translate(${210-p.widthMm/scale/2} 25) scale(${1/scale})">${(p.corridors??[p.corridor]).map(rect).join('')}${p.cores.map(rect).join('')}${rooms}${renderToStaticMarkup(createElement(CirculationLayer,{plan:p}))}</g><text x="12" y="278" font-size="3">縮尺 1:${scale} ／ 窓は記号・柱は中心位置（寸法未収録）</text>`
 return sheet(`${floor}階 平面図`,body)
}
export function shadowSheetSvg(input:{lot:Pt[];floors:{footprint:readonly Pt[];heightMm:number}[];lat:number;lon:number;date:string;rotation:number}):string|null{
 if(input.lot.length<3||!input.floors.length)return null
 const times=Array.from({length:9},(_,i)=>`${String(i+8).padStart(2,'0')}:00`)
 const shadows=times.map(time=>{const sun=winterSunAt(time,input,input.date);return {time,polys:sunShadowsOf(input.floors,sun?{...sun,azimuthFromSouthDeg:sun.azimuthFromSouthDeg-input.rotation}:null)??[]}})
 const pts=[...input.lot,...shadows.flatMap(s=>s.polys.flat())],xs=pts.map(p=>p.x),ys=pts.map(p=>p.y)
 const area={x0:15,y0:25,x1:405,y1:250},scale=chooseScaleOf(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys),area);if(!scale)return null
 const t=scaledTransformOf(pts,area,scale),path=(ps:readonly Pt[])=>'M'+ps.map(p=>{const q=t(p);return `${q.x.toFixed(3)} ${q.y.toFixed(3)}`}).join('L')+'Z'
 const colors=['#416b9d','#617fa5','#8095ad','#9ca7b4','#b5a77c','#b29c6e','#a8875b','#947446','#7b6039']
 let body=shadows.map((s,i)=>s.polys.map(poly=>`<path data-role="shadow" data-time="${s.time}" d="${path(poly)}" fill="${colors[i]}" fill-opacity="0.09" stroke="${colors[i]}" stroke-width="0.25"/>`).join('')).join('')
 body+=`<path data-role="lot" d="${path(input.lot)}" fill="none" stroke="#333" stroke-width="0.5" stroke-dasharray="2 1"/>`
 body+=input.floors.map(f=>`<path d="${path(f.footprint)}" fill="#dce3e7" stroke="#333" stroke-width="0.2"/>`).join('')
 body+=times.map((time,i)=>`<text x="${15+i*43}" y="261" font-size="3" fill="${colors[i]}">${time}</text>`).join('')
 body+=`<text x="12" y="278" font-size="3">縮尺 1:${scale} ／ 地盤面・計画建物のみ・日本時間 ／ 規制適否の判定図ではありません</text>`
 return sheet(`日影図 ${input.date} 08:00–16:00（1時間ごとの時刻日影）`,body)
}
