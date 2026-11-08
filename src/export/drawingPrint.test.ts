import {describe,it,expect} from 'vitest'
import {drawingPrintDocument} from './drawingPrint'
describe('PDF用の図面のみの印刷文書',()=>{it('各図面を別ページに配置し設定UIを含めない',()=>{
 const html=drawingPrintDocument(['<svg data-sheet="1"/>','<svg data-sheet="2"/>'])
 expect(html).toContain('size: A3 landscape')
 expect(html.match(/class="drawing-page"/g)).toHaveLength(2)
 expect(html).not.toContain('<button')
 expect(html).toContain('建築確認申請の図面')
})})
