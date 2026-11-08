import {it,expect} from 'vitest'
import {frameOfPlan} from './planFrame'
import {placeUnitPlan,readUnitPlan} from './unitPlan39'
import type {AutoPlan} from './autoPlan'
it('住戸の回転と同じ座標変換から柱位置と通り芯を取り、重複位置を統合する',()=>{
 const detail=readUnitPlan('T-08-1DK')!
 const cell={id:'u',x0:0,x1:detail.envelope.D,y0:0,y1:detail.envelope.W}
 const corridor={id:'c',x0:cell.x1,x1:cell.x1+1600,y0:0,y1:cell.y1}
 const plan={cells:[cell,{...cell,id:'u2'}],corridor,unitTypeIdsByCell:{u:'T-08-1DK',u2:'T-08-1DK'}} as unknown as AutoPlan
 const frame=frameOfPlan(plan),placed=placeUnitPlan('T-08-1DK','A',cell,corridor)
 expect(frame.columns.length).toBeGreaterThan(0)
 expect(frame.columns.map(({x,y})=>({x,y}))).toEqual(placed.columns!.map(({x,y})=>({x,y})))
 for(const c of frame.columns){expect(frame.xAxes).toContain(c.x);expect(frame.yAxes).toContain(c.y)}
})
import {objectTableOf,emptyObjectTableInput} from './objectTable'
import {sourcesOfTable} from './objectCountsOfTable'
import {countObjects} from './objectMenu'
it('計画柱の位置をオブジェクト表と柱一覧に含める',()=>{
 const input={...emptyObjectTableInput(),columns:[{x:100,y:200},{x:300,y:400}]}
 expect(countObjects(sourcesOfTable(objectTableOf(input))).find(r=>r.kind==='column')?.count).toBe(2)
})
