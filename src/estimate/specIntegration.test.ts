import {expect,it} from 'vitest'
import initSqlJs from 'sql.js'
import {packageLine,PACKAGE_VERSION} from './specPackages'
import {packageDetails,remainingLegacyDetails} from './specIntegration'
import {createEstimateTable,readEstimateLines,replaceEstimateLines} from '../db/estimateLineDb'
import {estimateCost} from './estimate'
import type {DetailLine} from './estimateDetail'

it('仕様付き明細をSQLiteから読み直しても出典と金額を失わず合計できる',async()=>{
 const line=packageLine({id:'1F/U1/K',part:'キッチン',quantity:2,unit:'台'},'PKG-026',{packageId:'PKG-026',version:PACKAGE_VERSION,price:{value:100000,status:'公表値',source:'テスト用の架空資料',url:'https://example.com/test-only',date:'2026-11-08',region:'テスト地域',scope:'本体・据付・接続'}})
 const SQL=await initSqlJs(),db=new SQL.Database();createEstimateTable(db);replaceEstimateLines(db,packageDetails([line]))
 const restored=readEstimateLines(db)
 expect(restored[0]?.specification?.source).toBe('テスト用の架空資料')
 expect(restored[0]?.specification?.priceStatus).toBe('公表値')
 expect(estimateCost([],[],restored.map(l=>({id:l.lineId,category:l.category,yen:l.amountYen,provisional:l.provisional}))).total_yen).toBe(200000)
 db.close()
})
it('パッケージと同じ範囲の旧集計を除き、他の工事は保持する',()=>{
 const base:DetailLine={lineId:'wall',objectId:'wall',category:'内装',item:'クロス',quantity:10,unit:'m2',unitPriceRef:null,provisional:false,basis:'平面',source:'平面'}
 const other={...base,lineId:'concrete',category:'躯体' as const,item:'コンクリート'}
 const remaining=remainingLegacyDetails([base,other],[{id:'R1/floor',part:'床',quantity:10,unit:'m2'}],[])
 expect(remaining.map(l=>l.lineId)).toEqual(['concrete'])
})
it('公表値はURL・適用日・地域なしでは採用しない',()=>{
 expect(()=>packageLine({id:'K',part:'キッチン',quantity:1,unit:'台'},'PKG-026',{packageId:'PKG-026',version:PACKAGE_VERSION,price:{value:1,status:'公表値',source:'テスト',url:'',date:'',region:'',scope:'本体施工'}})).toThrow()
})
