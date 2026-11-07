import {it,expect} from 'vitest'
import {shaftContinuityIssues} from './shaftContinuity'
const s={id:'PS-L0-ps',kind:'PS' as const,unitId:'L0',x0:100,y0:100,x1:700,y1:700}
it('同じ位置と寸法で下階まで連続するシャフトは成立',()=>{expect(shaftContinuityIssues({1:{shaftRects:[s]},2:{shaftRects:[s]}})).toEqual([])})
it('上階の位置ずれを検出',()=>{expect(shaftContinuityIssues({1:{shaftRects:[s]},2:{shaftRects:[{...s,x0:200,x1:800}]}})).toHaveLength(1)})
it('途中階で消えるシャフトを検出',()=>{expect(shaftContinuityIssues({1:{shaftRects:[s]},2:{shaftRects:[]},3:{shaftRects:[s]}}).some(x=>x.includes('2階'))).toBe(true)})
it('上階から始まり下階に経路のないシャフトを検出',()=>{expect(shaftContinuityIssues({1:{shaftRects:[]},2:{shaftRects:[s]}})).toHaveLength(1)})
it('上階のセットバックで終わるシャフトは許容',()=>{expect(shaftContinuityIssues({1:{shaftRects:[s]},2:{shaftRects:[]}})).toEqual([])})
