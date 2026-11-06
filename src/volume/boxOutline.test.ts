import {findClosedOutline} from '../canvas/closure'
import {it,expect} from 'vitest'
import {boxOutline} from './boxOutline'
it('幅・奥行きを保つ閉じた外形を作る',()=>{
 const result=boxOutline(12000,24000,{x:100,y:200})
 expect(findClosedOutline(result.flatMap(e=>e.segments)).closed).toBe(true)
 expect(result.flatMap(e=>e.segments)).toHaveLength(4)
 const nodes=result.flatMap(e=>e.nodes)
 expect(Math.max(...nodes.map(n=>n.x))-Math.min(...nodes.map(n=>n.x))).toBe(12000)
 expect(Math.max(...nodes.map(n=>n.y))-Math.min(...nodes.map(n=>n.y))).toBe(24000)
 expect(()=>boxOutline(0,24000,{x:0,y:0})).toThrow()
})
