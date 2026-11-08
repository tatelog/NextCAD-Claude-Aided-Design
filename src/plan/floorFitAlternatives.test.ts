import {it,expect,vi} from 'vitest'
import type {AutoPlan} from './autoPlan'
import type {UnitPlan39} from './unitPlan39'
vi.mock('./unitPlan39',async importOriginal=>({...await importOriginal<typeof import('./unitPlan39')>(),readUnitPlan:()=>null}))
import {fitFloorUnitsAutomatically,fitUnitAutomatically} from './automaticUnitFit'

const detail=(w:number,d:number):UnitPlan39=>({id:`${w}`,type:'test',envelope:{W:w,D:d,balcony_depth:0},rooms:[{id:'r',name:'LDK',kind:'居室',x:0,y:0,w,h:d,area_m2:w*d/1e6}],doors:[{id:'entry',kind:'玄関ドア',width:900,position:{orientation:'h',coord:0,start:1000}}],fixtures:[],windows:[],columns:[]})
const base={widthMm:7600,depthMm:6000,corridor:{id:'hall',x0:6000,x1:7600,y0:0,y1:6000},cells:[{id:'u',x0:0,x1:6000,y0:0,y1:6000}],cores:[],rooms:[],shaftRects:[],shafts:{ps:0},shortfall:0,unitTypeIdsByCell:{u:'test'}} as unknown as AutoPlan
const outline=[{x:2000,y:0},{x:7600,y:0},{x:7600,y:6000},{x:2000,y:6000}]
it('コア手前の残り長さを探索上限にし、住戸をコアへ伸ばさない',()=>{
 const plan=detail(4000,4000)
 const cache=new Map<string,ReturnType<typeof fitUnitAutomatically>>([['test:4500:6000',{plan,reasons:[]}]])
 const result=fitFloorUnitsAutomatically({...base,cores:[{id:'stairA',x0:0,x1:6000,y0:4500,y1:6000}]},outline,cache)
 expect(result.cells).toHaveLength(1)
 expect(result.cells[0]!.y1).toBeLessThanOrEqual(4500)
})
it('最初に収まった案で止めず、同じ区画で面積を多く確保する候補を選ぶ',()=>{
 const small=detail(4000,4000),large=detail(4500,4000)
 const cache=new Map<string,ReturnType<typeof fitUnitAutomatically>>([['test:6000:6000',{plan:small,candidates:[small,large],reasons:[]}]])
 const result=fitFloorUnitsAutomatically(base,outline,cache)
 expect(result.unitPlanOverrides?.u?.id).toBe('4500')
 expect(result.cells).toHaveLength(1)
})
it('最上位が外形から出ても、同面積の別形状を残して玄関を廊下に接続する',()=>{
 const outside=detail(3000,6000),inside=detail(4500,4000)
 const cache=new Map<string,ReturnType<typeof fitUnitAutomatically>>([['test:6000:6000',{plan:outside,candidates:[outside,inside],reasons:[]}]])
 const result=fitFloorUnitsAutomatically(base,outline,cache)
 expect(result.cells).toEqual([{id:'u',x0:2000,x1:6000,y0:0,y1:4500}])
 expect(result.unitPlanOverrides?.u?.id).toBe('4500')
 expect(result.unitPlanStatus?.u).toBe('ok')
 expect(base.cells[0]?.x0).toBe(0)
})
it('どの形状も収まらなければ住戸を残さず理由を返す',()=>{
 const outside=detail(3000,6000)
 const cache=new Map<string,ReturnType<typeof fitUnitAutomatically>>([['test:6000:6000',{plan:outside,candidates:[outside],reasons:[]}]])
 const result=fitFloorUnitsAutomatically(base,outline,cache)
 expect(result.cells).toEqual([])
 expect(result.automaticUnitRejections?.u).toContain('建物外形・コア・隣戸の範囲に収まりません')
})
