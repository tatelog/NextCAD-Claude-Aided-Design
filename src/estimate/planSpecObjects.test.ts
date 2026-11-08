import {expect,it} from 'vitest'
import {unitSpecObjects} from './planSpecObjects'
import {PACKAGE_VERSION,packageLine} from './specPackages'
import type {UnitPlan39} from '../plan/unitPlan39'
const unit:UnitPlan39={id:'u',type:'test',envelope:{W:4000,D:4000,balcony_depth:0},rooms:[{id:'A',name:'洋室',kind:'居室',x:0,y:0,w:2000,h:4000,area_m2:8},{id:'B',name:'洋室',kind:'居室',x:2000,y:0,w:2000,h:4000,area_m2:8}],doors:[{id:'D',kind:'ドア',width:750,between:['A','B'],position:{orientation:'v',coord:2000,start:1000}}],windows:[],fixtures:[],columns:[]}
it('共有壁を1回だけ拾い、開口控除し、階ごとに識別する',()=>{
 const objects=unitSpecObjects('1F/U1',unit,1)
 const walls=objects.filter(o=>o.part==='壁')
 expect(walls).toHaveLength(1)
 expect(packageLine(walls[0]!,'PKG-010',{packageId:'PKG-010',version:PACKAGE_VERSION,heightMm:2400,openingHeightMm:2000}).quantity).toBe(8.1)
 expect(objects.find(o=>o.part==='床')?.quantity).toBe(8)
 expect(unitSpecObjects('2F/U1',unit,2)[0]!.id).not.toBe(objects[0]!.id)
})
it('浴室内部の床天井と浴室扉はUBと二重計上しない',()=>{
 const bath={...unit,rooms:[{...unit.rooms[0]!,name:'浴室'}],doors:[{...unit.doors[0]!,kind:'浴室ドア',between:['A']}]}
 expect(unitSpecObjects('1F/U1',bath,1).filter(o=>['床','天井','室内戸'].includes(o.part))).toEqual([])
})
