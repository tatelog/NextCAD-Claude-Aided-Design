import {expect,it} from 'vitest'
import {sampleFloorPlans} from '../bimExchange/intermediate/fixtures'
import {autoPlanToSnapshot} from '../bimExchange/intermediate/autoPlanAdapter'
import {savedPlanStructureRows} from './savedPlanStructure'
import {detailLinesOfObjects} from './estimateObjects'
import {DEFAULT_REBAR} from './rebarCondition'

it('保存階だけを200mmで積算し、バルコニー・吹抜けを含む出力体積と一致する',()=>{
 const input=sampleFloorPlans(),before=structuredClone(input)
 const rows=savedPlanStructureRows(input.plans)
 const concrete=detailLinesOfObjects(rows,DEFAULT_REBAR).find(r=>r.item==='コンクリート（床版）')!
 // 外形9㎡＋外側バルコニー3㎡−吹抜け1㎡。未保存の1階を複製しない。
 expect(concrete.quantity).toBeCloseTo(2.2)
 const snapshot=autoPlanToSnapshot(input)
 const area=(r:{x:number;y:number}[])=>Math.abs(r.reduce((s,p,i)=>{const q=r[(i+1)%r.length]!;return s+p.x*q.y-q.x*p.y},0))/2
 const slabs=snapshot.elements.filter(e=>e.kind==='slab'||e.kind==='balcony')
 expect(slabs.every(e=>e.heightMm===200)).toBe(true)
 const volume=slabs.reduce((s,e)=>s+(e.footprint?(area(e.footprint.outer)-e.footprint.holes.reduce((n,h)=>n+area(h),0))*e.heightMm!/1e9:0),0)
 expect(volume).toBeCloseTo(concrete.quantity)
 expect(input).toEqual(before)
})

import { placeUnitPlan } from '../plan/unitPlan39'
import { exportConfiguredPlan } from '../bimExchange/integration/exportConfiguredPlan'
import { defaultBimSettings } from '../store/bimSettings'
it('保存住戸の扉・PSを描画や出力で変更しない',()=>{
 const input=sampleFloorPlans(),p=input.plans[2]!,u=p.unitPlanOverrides!.unit!
 u.doors=[{id:'entry',kind:'玄関ドア',width:900,swing_into:'玄関',position:{orientation:'h',coord:0,start:0}}]
 const before=structuredClone(input)
 expect(placeUnitPlan('', 'A',p.cells[0]!,p.corridor,u).plan).toBe(u)
 const exported=exportConfiguredPlan({source:input.source,plans:input.plans,storeyHeightMm:3000},defaultBimSettings())
 expect(exported.model.storeys).toHaveLength(1)
 expect(exported.files.find(f=>f.path==='model.ifc')?.text).toContain('ISO-10303-21')
 expect(input).toEqual(before)
})
