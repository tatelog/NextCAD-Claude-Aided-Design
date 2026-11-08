import type {UnitPlan39} from '../plan/unitPlan39'
import type {SpecObject} from './specPackages'
/** 配管経路・器具仕様の未作図分。実測数量と区別して保存平面から概算する。 */
export function provisionalServices(prefix:string,plan:UnitPlan39,floor:number):SpecObject[]{
 const rooms=plan.rooms.filter(r=>r.kind==='居室'),n=rooms.length
 const area=plan.envelope.W*plan.envelope.D/1e6
 const definitions:[string,number,string,string][]=[
  ['給水',20,'m','住戸あたり20m'],['給湯',15,'m','住戸あたり15m'],
  ['排水',15,'m','住戸あたり15m'],['換気',10,'m','住戸あたり10m'],
  ['給湯器',1,'台','住戸あたり1台'],['空調',n,'台','居室あたり1台'],
  ['空調配管',n*5,'m','居室あたり5m'],['照明',n+4,'台','居室あたり1台＋玄関・廊下・脱衣・トイレ4台'],
  ['コンセント',n*3+5,'箇所','居室あたり3箇所＋水回り等5箇所'],
  ['スイッチ',n+4,'箇所','照明区画あたり1箇所'],
  ['電気配線',Math.round(area*2),'m','住戸区画面積あたり2m/m2'],
  ['分電盤',1,'面','住戸あたり1面'],
 ]
 return definitions.map(([part,quantity,unit,rule])=>({id:`${prefix}/provisional/${part}`,part,name:`${prefix} ${part}（仮仕様）`,quantity,unit,category:'内装',floor,basis:`仮数量：${rule}。配管・配線経路、器具配置は未作図。仮単価による概算`}))
}
