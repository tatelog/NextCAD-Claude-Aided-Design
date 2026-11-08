import {it,expect} from 'vitest'
import {recordPage} from './recordPage'
it('表示だけを30件に区切り、元の全件を保持する',()=>{const rows=Array.from({length:65},(_,i)=>i);expect(recordPage(rows,0).items).toEqual(rows.slice(0,30));expect(recordPage(rows,1).items).toEqual(rows.slice(30,60));expect(recordPage(rows,9).items).toEqual(rows.slice(60));expect(rows).toHaveLength(65)})
it('空配列でもページを操作できる値を返す',()=>{expect(recordPage([],9)).toEqual({items:[],page:0,pages:1,total:0})})
