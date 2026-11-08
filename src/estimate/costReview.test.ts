import {it,expect} from 'vitest'
import {costReview} from './costReview'
it('仮単価の計上済み行と未計上行を区別し、確定済み行を警告しない',()=>{expect(costReview([{item:'床',amountYen:500,provisional:true},{item:'床',amountYen:700,provisional:true},{item:'外壁',amountYen:null,provisional:true},{item:'窓',amountYen:100,provisional:false}])).toEqual([{area:'未計上',text:'外壁（1件）。数量・単価を右の内訳で確認してください。'},{area:'仮単価で計上済み',text:'2件。仮の金額は合計に含まれています。'}])})
it('確定済み明細だけなら確認不要',()=>{expect(costReview([{item:'床',amountYen:500,provisional:false}])).toEqual([])})
