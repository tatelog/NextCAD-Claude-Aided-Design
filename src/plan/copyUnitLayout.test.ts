import {it,expect} from 'vitest'
import {copyUnitLayout} from './copyUnitLayout'
import type {AutoPlan} from './autoPlan'
import type {UnitPlan39} from './unitPlan39'
const detail:UnitPlan39={id:'source',type:'test',envelope:{W:4000,D:4000,balcony_depth:0},rooms:[{id:'r',name:'LDK',kind:'居室',x:0,y:0,w:4000,h:4000,area_m2:16}],doors:[{id:'e',kind:'玄関ドア',width:900,position:{orientation:'h',coord:0,start:1500}}],fixtures:[],columns:[],windows:[]}
const base={widthMm:5600,depthMm:12000,corridor:{id:'c',x0:4000,x1:5600,y0:0,y1:12000},cells:[{id:'a',x0:0,x1:4000,y0:0,y1:4000},{id:'b',x0:0,x1:4000,y0:4000,y1:8000},{id:'c',x0:0,x1:4000,y0:8000,y1:12000}],cores:[],unitTypeIdsByCell:{a:'test',b:'test',c:'other'},unitPlanOverrides:{a:detail},shaftRects:[],rooms:[]} as unknown as AutoPlan
it('同寸法かつ同タイプへ詳細を反映し別タイプと元データを変えない',()=>{
 const r=copyUnitLayout(base,'a')
 expect(r.error).toBeUndefined()
 expect(r.plan?.unitPlanOverrides?.b).toEqual(detail)
 expect(r.plan?.unitPlanOverrides?.c).toBeUndefined()
 expect(base.unitPlanOverrides?.b).toBeUndefined()
})
it('室内動線を塞ぐ案は一括反映しない',()=>{
 const blocked={...base,unitPlanOverrides:{a:{...detail,fixtures:[{id:'wall',kind:'収納',x:0,y:1800,w:4000,h:600}]}}}
 expect(copyUnitLayout(blocked,'a').plan).toBeUndefined()
 expect(copyUnitLayout(blocked,'a').error).toBeTruthy()
})
it('反映先の固定PSを消す変更は拒否する',()=>{
 const p={...base,shaftRects:[{id:'PS-b',kind:'PS' as const,unitId:'b',x0:100,y0:4100,x1:600,y1:4600}]}
 expect(copyUnitLayout(p,'a').error).toContain('シャフト')
 expect(copyUnitLayout(p,'a').plan).toBeUndefined()
})
