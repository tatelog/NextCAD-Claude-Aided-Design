import {describe,it,expect} from 'vitest'
import {patternConfiguration} from './patternConfiguration'
describe('構成条件',()=>{
 it('選択タイプを重複除去し、最低戸数と既存の比率制約を外す',()=>{
  expect(patternConfiguration(['a','b','a'])).toEqual({allowedTypeIds:['a','b'],minimumUnitsPerFloor:{},minimumFamilyRatio:undefined})
 })
 it('未選択は計算に渡さない',()=>{expect(()=>patternConfiguration([])).toThrow()})
})
