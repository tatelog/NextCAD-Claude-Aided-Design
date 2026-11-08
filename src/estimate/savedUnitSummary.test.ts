import {expect,it} from 'vitest'
import {savedUnitSummary} from './savedUnitSummary'
import {generateAutoPlan} from '../plan/autoPlan'
it('保存階の各住戸を一度だけ数え、同タイプの異なる面積を合算する',()=>{
 const p=generateAutoPlan({targetPerFloor:4,storeyCount:5,storeyHeightMm:3000,spanMm:6000,unitDepthMm:6000,corridorMm:1600,evCount:1,evStops:[1],layout:'中廊下'})
 p.cells=p.cells.slice(0,2)
 p.unitTypeIdsByCell=Object.fromEntries(p.cells.map(c=>[c.id,'T-08-2LDK']))
 p.rooms=p.cells.map((c,i)=>({id:c.id+'-r',kind:'LDK' as const,name:'LDK',x0:c.x0,y0:c.y0,x1:c.x0+1000,y1:c.y0+(i+1)*1000}))
 const rows=savedUnitSummary({1:p,2:p})
 expect(rows).toEqual([{type:'2LDK',count:4,totalM2:6,averageM2:1.5}])
})
