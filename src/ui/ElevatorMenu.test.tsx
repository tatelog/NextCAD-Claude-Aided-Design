// 仕様: EVメニューに人数入力・計算根拠・結果をまとめ、未計算を0台と表示しない。
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {it,expect} from 'vitest'
import {ElevatorMenu} from './ElevatorMenu'
it('EVメニューに人数入力と算定根拠を集約する',()=>{
 const html=renderToStaticMarkup(createElement(ElevatorMenu,{plan:null,peopleText:'3',residentsText:'',onPeople:()=>{},onResidents:()=>{},onApply:()=>{}}))
 expect(html).toContain('EV（エレベーター）')
 expect(html).toContain('想定居住人数（全階）')
 expect(html).toContain('5分間の輸送需要')
 expect(html).toContain('未計算')
 expect(html).not.toContain('0台')
 expect(html).not.toContain('<details open')
})
