import { expect, it } from 'vitest'
import { cutFootprint, cutFootprintParts, removedPiecesOf } from './slope'
import { polygonAreaMm2 } from '../geom/polygon'
const rect=(x:number,y:number,w:number,h:number)=>[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}]
const boundary={point:{x:10000,y:10000},inward:{x:0,y:-1},coefficient:1,riseMm:0,kind:'adjacent' as const,segment:[{x:10000,y:10000},{x:20000,y:10000}] as const}
it('鍵型の短い境界の延長先にある遠い部分を切らない',()=>{
 const p=rect(0,12000,4000,4000)
 expect(polygonAreaMm2(cutFootprint(p,[boundary],3000))).toBe(polygonAreaMm2(p))
 expect(removedPiecesOf(p,[boundary],3000)).toEqual([])
})
it('境界端点の近傍は円弧状の距離制限が残る',()=>{
 const p=rect(8000,8000,4000,4000)
 expect(polygonAreaMm2(cutFootprint(p,[boundary],3000))).toBeLessThan(polygonAreaMm2(p))
})

it('分離した両側を残し、残存部分と除去部分の面積が一致する',()=>{
 const p=rect(0,0,30000,10000)
 const b={...boundary,segment:[{x:15000,y:0},{x:15000,y:10000}] as const}
 const kept=cutFootprintParts(p,[b],2000), removed=removedPiecesOf(p,[b],2000)
 expect(kept).toHaveLength(2)
 expect([...kept,...removed].reduce((sum,p)=>sum+polygonAreaMm2(p),0)).toBeCloseTo(polygonAreaMm2(p),1)
})
