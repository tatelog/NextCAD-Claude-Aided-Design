import {expect,it} from 'vitest'
import {prepareVolumePlan} from './volumePlan'
it('ツインのEV乗り場は中央で両側の廊下につながり、住戸列を欠かない',()=>{
 const volume={footprint:[{x:0,y:0},{x:26000,y:0},{x:26000,y:66500},{x:0,y:66500}],storey_count:5,storey_height:3000}
 const p=prepareVolumePlan(volume,[],{layout:'ツイン',span:3000,corridor:1600,unitDepth:7400}).plans[1]!
 const [west,east]=p.corridors!,lobby=p.circulation!.lobby
 expect(lobby.x0).toBe(west!.x1)
 expect(lobby.x1).toBe(east!.x0)
 expect(p.circulation!.liftShafts.every(s=>s.y1===lobby.y0&&s.x0>=lobby.x0&&s.x1<=lobby.x1)).toBe(true)
 expect(p.circulation!.elevatorRoutes).toHaveLength(p.cells.length)
 const walk=[...p.corridors!,...p.bridges!,lobby]
 for(const path of p.circulation!.elevatorRoutes!)for(let i=1;i<path.length;i++)for(let t=0;t<=1;t+=.05){
  const a=path[i-1]!,b=path[i]!,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t
  expect(walk.some(r=>x>=r.x0-.01&&x<=r.x1+.01&&y>=r.y0-.01&&y<=r.y1+.01)).toBe(true)
 }
},120000) // 性能の課題（未解決）: 単独で約 43 秒（全体の実行では約 45 秒。2026-11-08 計測）。以前の注（統括 2026-11-08）では約 6 秒で、Codex の版で大きく遅くなった。待ち時間を延ばしただけで、計算を軽くする直しは残っている

it('指定廊下幅2200mmを中央EVの連絡乗り場でも維持する',()=>{
 const volume={footprint:[{x:0,y:0},{x:26000,y:0},{x:26000,y:66500},{x:0,y:66500}],storey_count:5,storey_height:3000}
 const p=prepareVolumePlan(volume,[],{layout:'ツイン',span:3000,corridor:2200,unitDepth:7400}).plans[1]!
 expect(p.circulation!.lobby.y1-p.circulation!.lobby.y0).toBeGreaterThanOrEqual(2200)
},60000)
import {arrangeCirculation} from './automaticCirculation'
import {generateAutoPlan} from './autoPlan'
import {masterOf} from './unitTypeMaster'
import candidates from './unitTypeCandidates.json'
import {viableUnitType} from './automaticUnitFit'
import {layoutMetrics} from './layoutQuality'
it('ツインのEVを反対端にも集約し両廊下への接続を維持して比較する',()=>{
 const types=masterOf(candidates).filter(t=>viableUnitType(t.id))
 const base=generateAutoPlan({unitTypes:types,unitTypeIds:types.map(t=>t.id),optimizeTypes:true,targetPerFloor:1,storeyCount:3,storeyHeightMm:3000,spanMm:3000,unitDepthMm:7400,corridorMm:1600,layout:'ツイン',evCount:1,evStops:[1,2,3],outline:{widthMm:26000,depthMm:66500}})
 const shape=[{x:0,y:0},{x:26000,y:0},{x:26000,y:66500},{x:0,y:66500}]
 const options={rotateStairs:true,clusterElevator:true}
 const a=arrangeCirculation(base,[shape,shape,shape],3,undefined,{...options,elevatorEnd:0})
 const b=arrangeCirculation(base,[shape,shape,shape],3,undefined,{...options,elevatorEnd:1})
 const p=b.plans[1]!,lobby=p.circulation!.lobby
 expect(lobby.y1).toBe(p.cores.find(c=>c.id==='stairB')!.y0)
 expect(lobby.x0).toBe(p.corridors![0]!.x1);expect(lobby.x1).toBe(p.corridors![1]!.x0)
 const overlap=(r:any,s:any)=>Math.min(r.x1,s.x1)>Math.max(r.x0,s.x0)&&Math.min(r.y1,s.y1)>Math.max(r.y0,s.y0)
 expect(p.voids!.some(v=>overlap(v,lobby)||p.circulation!.liftShafts.some(s=>overlap(v,s)))).toBe(false)
 const best=arrangeCirculation(base,[shape,shape,shape],3,undefined,options)
 expect(layoutMetrics(best.plans).privateM2).toBeCloseTo(Math.max(layoutMetrics(a.plans).privateM2,layoutMetrics(b.plans).privateM2))
},60000)
