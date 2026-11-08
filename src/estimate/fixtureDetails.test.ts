import {it,expect} from 'vitest'
import initSqlJs from 'sql.js'
import {fixtureDetails} from './fixtureDetails'
import {estimateDetailsOf} from './estimateDetails'
import {estimateCost,type PriceRow} from './estimate'
import {quantityLinesOfTable} from './estimateTable'
import {createEstimateTable,replaceEstimateLines,readEstimateLines} from '../db/estimateLineDb'
it('什器の台数と単価参照をDBで保持し同じ明細から合計する',async()=>{
 const prices:PriceRow[]=[{id:'k',item:'キッチン',unit:'台',kind:'造作',category:'内装',unit_price:100,source_ref:'テスト専用',provisional:true,version:'test'}]
 const details=fixtureDetails([{id:'a',item:'kitchen',unitId:'1'},{id:'b',item:'kitchen',unitId:'2'}])
 const SQL=await initSqlJs(), db=new SQL.Database();createEstimateTable(db)
 replaceEstimateLines(db,estimateDetailsOf(details,prices));const rows=readEstimateLines(db)
 expect(rows[0]).toMatchObject({quantity:2,unit:'台',unitPriceRef:'k',amountYen:200})
 expect(estimateCost(prices,quantityLinesOfTable(rows,prices)).total_yen).toBe(200)
 expect(estimateDetailsOf(details,[{...prices[0]!,unit:'m2'}])[0]?.amountYen).toBeNull()
 db.close()
})
