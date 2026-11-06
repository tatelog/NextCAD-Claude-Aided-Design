import {it,expect} from 'vitest'
import {movePlanCore} from './movePlanCore'
import {rectangularStudy} from './rectangularStudy'
it('コア移動は寸法を保ち、元の配置を変更しない',()=>{
 const {plan}=rectangularStudy({widthMm:20000,lengthMm:42000,corridorMm:2000,columnMm:600,storeys:5,storeyHeightMm:3000,types:[{id:'a',frontageMm:6000,depthMm:6000,psMm:600,wetEnd:'start'}]})
 const outline=[{x:0,y:0},{x:20000,y:0},{x:20000,y:42000},{x:0,y:42000}]
 const moved=movePlanCore(plan,'evHall',1000,0,outline)
 expect(moved.cores.find(c=>c.id==='evHall')!.x0).toBe(plan.cores.find(c=>c.id==='evHall')!.x0+1000)
 expect(moved.shaftRects.find(s=>s.kind==='EPS')!.x0).toBe(plan.shaftRects.find(s=>s.kind==='EPS')!.x0+1000)
 expect(()=>movePlanCore(plan,'evHall',30000,0,outline)).toThrow()
 expect(()=>movePlanCore(plan,'evHall',0,6000,outline)).toThrow()
})
