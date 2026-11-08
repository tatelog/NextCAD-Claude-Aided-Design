import {it,expect} from 'vitest'
import {readUnitPlan,placeUnitPlan} from './unitPlan39'
import {clearEntry} from './entryClearance'
import {entryChecks} from './entryChecks'
import type {AutoPlan} from './autoPlan'
it('玄関を室内側へ開き共用廊下の有効幅を侵さない',()=>{
 const source=readUnitPlan('T-08-1DK')!,p=clearEntry(source)
 const cell={id:'u',x0:0,x1:p.envelope.D,y0:0,y1:p.envelope.W},corridor={id:'c',x0:cell.x1,x1:cell.x1+1600,y0:0,y1:cell.y1}
 const placed=placeUnitPlan('T-08-1DK','A',cell,corridor)
 expect(Math.max(...placed.entrySweep!.map(p=>p.x))).toBeLessThanOrEqual(corridor.x0)
 expect(entryChecks({cells:[cell],corridor,unitTypeIdsByCell:{u:'T-08-1DK'}} as unknown as AutoPlan).issues).toEqual([])
})
