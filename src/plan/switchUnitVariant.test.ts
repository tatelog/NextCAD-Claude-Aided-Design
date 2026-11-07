import {it,expect,vi} from 'vitest'
import type {AutoPlan} from './autoPlan'
import {switchUnitVariant} from './switchUnitVariant'
vi.mock('./unitPlan39',async()=>{
 const original=await vi.importActual<typeof import('./unitPlan39')>('./unitPlan39')
 return {...original,readUnitPlan:(_type:string,variant:string)=>variant==='missing'?null:({id:variant,type:'test',envelope:{W:4000,D:4000,balcony_depth:0},rooms:[{id:'r',name:'LDK',kind:'居室',x:0,y:0,w:4000,h:4000,area_m2:16}],doors:[{id:'e',kind:'玄関ドア',width:900,position:{orientation:'h',coord:0,start:1500}}],fixtures:variant==='blocked'?[{id:'wall',kind:'収納',x:0,y:1800,w:4000,h:600}]:[],windows:[],columns:[]})}
})
const base={widthMm:5600,depthMm:4000,corridor:{id:'c',x0:4000,x1:5600,y0:0,y1:4000},cells:[{id:'u',x0:0,x1:4000,y0:0,y1:4000}],cores:[],unitTypeIdsByCell:{u:'test'},unitPlanVariants:{u:'A'},unitPlanOverrides:{u:{id:'old'}},shaftRects:[],rooms:[]} as unknown as AutoPlan
it('別案を選ぶと自動調整済み旧案を選択した案で置き換える',()=>{
 const result=switchUnitVariant(base,'u','B')
 expect(result.error).toBeUndefined()
 expect(result.plan?.unitPlanOverrides?.u?.id).toBe('B')
 expect(result.plan?.unitPlanVariants?.u).toBe('B')
 expect(base.unitPlanOverrides?.u?.id).toBe('old')
})
it('室内を分断する家具がある案を反映しない',()=>{
 expect(switchUnitVariant(base,'u','blocked').plan).toBeUndefined()
 expect(switchUnitVariant(base,'u','blocked').error).toBeTruthy()
})
it('存在しない案を反映しない',()=>expect(switchUnitVariant(base,'u','missing').error).toBeTruthy())
