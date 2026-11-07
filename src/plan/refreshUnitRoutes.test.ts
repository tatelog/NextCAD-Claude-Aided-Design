import {it,expect} from 'vitest'
import {refreshUnitRoutes} from './refreshUnitRoutes'
import type {AutoPlan} from './autoPlan'
const plan={cells:[{id:'u',x0:0,x1:4000,y0:0,y1:4000}],corridor:{id:'c',x0:4000,x1:5600,y0:0,y1:10000},cores:[],unitPlanOverrides:{u:{id:'p',type:'test',envelope:{W:4000,D:4000,balcony_depth:0},rooms:[],fixtures:[],columns:[],windows:[],doors:[{id:'e',kind:'玄関ドア',width:900,position:{orientation:'h',coord:0,start:1500}}]}},circulation:{routes:[[{x:4000,y:500},{x:4800,y:500},{x:4800,y:1000}],[{x:4000,y:500},{x:4800,y:500},{x:4800,y:9000}]],elevatorRoutes:[],evCount:0}} as unknown as AutoPlan
it('変更後の玄関から階段への距離を更新し元の評価を変更しない',()=>{
 const result=refreshUnitRoutes(plan)
 expect(result.circulation!.routes[0]![0]).toEqual({x:4000,y:1950})
 expect(result.circulation!.routeMetrics![0]!.firstMm).toBe(1750)
 expect(plan.circulation!.routes[0]![0]!.y).toBe(500)
})
it('住戸と経路の対応が失われた評価は再利用しない',()=>{
 expect(()=>refreshUnitRoutes({...plan,cells:[]})).toThrow()
})
it('更新した経路が廊下の外を通る場合は反映を拒否する',()=>{
 const broken={...plan,circulation:{...plan.circulation!,routes:plan.circulation!.routes.map(r=>r.map((p,i)=>i===2?{x:9000,y:p.y}:p))}}
 expect(()=>refreshUnitRoutes(broken)).toThrow('通行幅')
})
