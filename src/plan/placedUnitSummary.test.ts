// 仕様: 配置済みの全階の住戸だけを集計し、未作成階を推定で複製しない。
// 型不明の住戸も合計と「タイプ未設定」に含め、配置なしと0戸を区別する。
import { describe, it, expect } from 'vitest'
import { summarizePlacedUnits } from './placedUnitSummary'
const types = [{id:'a',name:'2LDK'},{id:'b',name:'3LDK'}]
describe('配置住戸サマリー',()=>{
 it('階ごとの実配置から合計と型別内訳を算出する',()=>{
  const result=summarizePlacedUnits({1:{cells:[{id:'u'},{id:'v'}],unitTypeIdsByCell:{u:'a',v:'b'}},2:{cells:[{id:'u'}],unitTypeIdsByCell:{u:'a'}}},types,2,3)
  expect(result).toEqual({total:3,selected:1,plannedFloors:2,unplannedFloors:1,byType:[{name:'2LDK',count:2},{name:'3LDK',count:1}]})
 })
 it('未知の型を落とさず、存在しない住戸の型情報を数えない',()=>{
  expect(summarizePlacedUnits({1:{cells:[{id:'u'}],unitTypeIdsByCell:{u:'unknown',removed:'a'}}},types,1,1).byType).toEqual([{name:'タイプ未設定',count:1}])
 })
 it('未作成をゼロ戸と区別し、範囲外の階を集計しない',()=>{
  expect(summarizePlacedUnits({4:{cells:[{id:'x'}]}},types,1,3)).toEqual({total:null,selected:null,plannedFloors:0,unplannedFloors:3,byType:[]})
  expect(summarizePlacedUnits({1:{cells:[]}},types,1,1).total).toBe(0)
 })
})
