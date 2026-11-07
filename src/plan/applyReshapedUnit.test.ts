import {it,expect} from 'vitest'
import {applyReshapedUnit} from './applyReshapedUnit'
import type {AutoPlan} from './autoPlan'
import type {UnitPlan39} from './unitPlan39'
const base={widthMm:5600,depthMm:4000,corridor:{id:'c',x0:4000,x1:5600,y0:0,y1:4000},cells:[{id:'u',x0:0,x1:4000,y0:0,y1:4000}],cores:[],unitTypeIdsByCell:{u:'1DK'},shaftRects:[],rooms:[]} as unknown as AutoPlan
const room:UnitPlan39={id:'p',type:'1DK',envelope:{W:4000,D:4000,balcony_depth:0},rooms:[{id:'r',name:'LDK',kind:'居室',x:0,y:0,w:4000,h:4000,area_m2:16}],doors:[{id:'e',kind:'玄関ドア',width:900,position:{orientation:'h',coord:4000,start:1500}}],fixtures:[],windows:[],columns:[]}
it('室内が通れても玄関が共用廊下と反対側なら変更を拒否する',()=>{
 const before=JSON.stringify(base)
 const result=applyReshapedUnit(base,'u',room)
 expect(result.error).toContain('共用廊下')
 expect(result.plan).toBeUndefined()
 expect(JSON.stringify(base)).toBe(before)
})
it('玄関が廊下につながり室内が通れる変更は反映できる',()=>{
 const connected={...room,doors:[{...room.doors[0]!,position:{orientation:'h' as const,coord:0,start:1500}}]}
 expect(applyReshapedUnit(base,'u',connected).error).toBeUndefined()
 expect(applyReshapedUnit(base,'u',connected).plan).toBeDefined()
})
