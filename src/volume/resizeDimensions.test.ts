import {expect,it} from 'vitest'
import {resizeDimensions,outlineDimensions} from './resizeDimensions'
const box=[{x:100,y:200},{x:12100,y:200},{x:12100,y:12200},{x:100,y:12200}]
it('中心を保ち横と縦を独立に変更する',()=>{const next=resizeDimensions(box,18000,9000);expect(outlineDimensions(next)).toEqual({width:18000,depth:9000});expect((next[0]!.x+next[2]!.x)/2).toBe(6100);expect((next[0]!.y+next[2]!.y)/2).toBe(6200);expect(box[0]).toEqual({x:100,y:200})})
it('無効な寸法で外形を壊さない',()=>{for(const n of [0,-1,NaN,Infinity])expect(()=>resizeDimensions(box,n,12000)).toThrow()})
it('寸法を取得できない外形は拒否',()=>expect(()=>resizeDimensions([],100,100)).toThrow())
