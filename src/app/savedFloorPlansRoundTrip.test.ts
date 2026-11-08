import {describe,it,expect} from 'vitest'
import {generateAutoPlan} from '../plan/autoPlan'
import {SavedFloorPlansSchema} from './savedFloorPlans'
describe('生成平面の保存往復',()=>{it('階段・EVのコアをkind追加なしで復元する',()=>{
 const p=generateAutoPlan({targetPerFloor:1,storeyCount:5,storeyHeightMm:3000,spanMm:3000,unitDepthMm:6000,corridorMm:1600,layout:'中廊下',evCount:1,evStops:[],outline:{widthMm:13600,depthMm:30000}})
 const saved=JSON.parse(JSON.stringify({1:p}))
 expect(SavedFloorPlansSchema.parse(saved)[1]!.cores).toEqual(p.cores)
})})
