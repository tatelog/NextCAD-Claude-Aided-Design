import {describe,it,expect} from 'vitest'
import {associateRoads} from './roadAssociation'
const lot=[{x:0,y:0},{x:20000,y:0},{x:20000,y:30000},{x:0,y:30000}]
const frame={lon0:0,lat0:0,kx:1000,ky:1000,cx:0,cy:0}
const roads=[{w:3,c:3,s:1,g:[[-10,-4],[30,-4]] as [number,number][]}]
describe('筆の辺とN13道路の照合',()=>{
 it('外側で平行かつ重なる道路を接道候補にする',()=>{
  const links=associateRoads(lot,frame,roads)
  expect(links[0]!.candidates[0]).toMatchObject({widthClass:3,distanceMm:4000,overlapMm:20000})
  expect(links[0]!.adoptedWidthMm).toBeNull()
  expect(links.slice(1).every(l=>l.candidates.length===0)).toBe(true)
 })
 it('内側・遠方・交差方向・辺の延長先だけの道路は結び付けない',()=>{
  for(const g of [[[0,4],[20,4]],[[0,-100],[20,-100]],[[10,-10],[10,0]],[[25,-4],[35,-4]]]) {
   expect(associateRoads(lot,frame,[{w:3,c:3,s:1,g:g as [number,number][]}])[0]!.candidates).toHaveLength(0)
  }
 })
 it('複数候補は勝手に一本へ確定しない',()=>{
  const links=associateRoads(lot,frame,[...roads,{...roads[0]!,g:[[-10,-5],[30,-5]]}])
  expect(links[0]!.status).toBe('multiple')
 })
 it('道路未取得と候補なしを分ける',()=>{
  expect(associateRoads(lot,frame,null)[0]!.status).toBe('unavailable')
  expect(associateRoads(lot,frame,[])[0]!.status).toBe('none')
 })
 it('基準面を回しても同じ辺に対応し、距離と長さを保つ',()=>{
  const rotated=lot.map(p=>({x:-p.y,y:p.x}))
  const link=associateRoads(rotated,{...frame,rotationDeg:90},roads)[0]!
  expect(link.candidates[0]!.distanceMm).toBeCloseTo(4000)
  expect(link.edgeLengthMm).toBe(20000)
 })
})
