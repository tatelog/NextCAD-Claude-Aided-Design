import {FIXTURE_ITEMS,type Fixture} from '../plan/fixtures'
import type {DetailLine} from './estimateDetail'
export function fixtureDetails(fixtures:readonly Fixture[]):DetailLine[]{
 return FIXTURE_ITEMS.flatMap(({id,label})=>{
  const count=fixtures.filter(f=>f.item===id).length
  return count?[{lineId:`fixture-count/${id}`,objectId:`fixture-count/${id}`,category:'内装',item:label,quantity:count,unit:'台',unitPriceRef:null,provisional:false,basis:'保存済み各階の配置什器と手配置の台数',source:'平面の配置オブジェクト'}]:[]
 })
}
