import {expect,it} from 'vitest'
import {remainingCoreSpace} from './coreCellSpace'
const cell={id:'u',x0:0,x1:6000,y0:0,y1:9000}
it('端部のコアを除いた住戸候補を元の識別子で残す',()=>{
 expect(remainingCoreSpace(cell,[{...cell,id:'stair',y1:2500}])).toEqual({...cell,y0:2500})
 expect(cell.y0).toBe(0)
})
it('複数コア間の最大の連続区間だけを残す',()=>{
 expect(remainingCoreSpace(cell,[{...cell,id:'a',y1:2000},{...cell,id:'b',y0:7000}])).toEqual({...cell,y0:2000,y1:7000})
})
it('隣の列や接するだけのコアでは区画を削らない',()=>{
 expect(remainingCoreSpace(cell,[{...cell,id:'a',x0:6000,x1:9000}])).toEqual(cell)
})
it('全域が塞がれば候補を返さない',()=>{
 expect(remainingCoreSpace(cell,[{...cell,id:'a'}])).toBeNull()
})
