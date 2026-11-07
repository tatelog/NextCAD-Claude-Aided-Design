import {describe,it,expect} from 'vitest'
import {useFloorPlans} from './floorPlans'
import {rectangularStudy} from '../plan/rectangularStudy'
describe('長方形配置の採用',()=>{
 it('全階に独立した配置を反映し、先頭階を選択する',()=>{
 const {plan}=rectangularStudy({widthMm:16000,lengthMm:42000,corridorMm:2000,columnMm:600,storeys:5,storeyHeightMm:3000,types:[{id:'test',frontageMm:6000,depthMm:6000,psMm:600,wetEnd:'start'}]})
 useFloorPlans.getState().applyRectangle('volume-A',plan,5)
 const state=useFloorPlans.getState()
 expect(Object.keys(state.plans)).toHaveLength(5)
 expect(state.selected).toBe(1)
 expect(state.rectangle).toEqual({source:'volume-A',widthMm:16000,depthMm:42000})
 expect(state.plans[5]).toEqual(plan)
 expect(state.plans[1]).not.toBe(state.plans[2])
 expect(state.plans[1]!.cells).not.toBe(plan.cells)
 })
})
