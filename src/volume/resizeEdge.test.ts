import { describe, it, expect } from 'vitest'
import { resizeEdge } from './resizeEdge'
describe('底辺の幅調整', () => {
 const p = [{x:0,y:0},{x:12000,y:0},{x:12000,y:24000},{x:0,y:24000}]
 it('辺の法線方向だけ動かし対辺を固定する',()=> {
  expect(resizeEdge(p,1,{x:3000,y:2000})).toEqual([{x:0,y:0},{x:15000,y:0},{x:15000,y:24000},{x:0,y:24000}])
 })
 it('潰れる操作は拒否する',()=>expect(resizeEdge(p,1,{x:-13000,y:0})).toBeNull())
 it('回転済みの辺でも接線方向には動かない',()=> {
  const q=p.map(({x,y})=>({x:-y,y:x}))
  expect(resizeEdge(q,1,{x:2000,y:3000})).toEqual([{x:0,y:0},{x:0,y:15000},{x:-24000,y:15000},{x:-24000,y:0}])
 })
})
