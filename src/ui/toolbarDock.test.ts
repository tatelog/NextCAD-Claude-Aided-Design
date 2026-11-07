import {describe,it,expect} from 'vitest'
import {toolbarDock} from './toolbarDock'
describe('プレビュー端への固定',()=>{
 it('各辺の近くで対応する端に固定する',()=>{
 expect(toolbarDock(10,200,800,600)).toBe('left')
 expect(toolbarDock(790,200,800,600)).toBe('right')
 expect(toolbarDock(400,12,800,600)).toBe('top')
 expect(toolbarDock(400,590,800,600)).toBe('bottom')
 })
 it('中央では浮かせ、角では近い辺を選ぶ',()=>{
 expect(toolbarDock(400,300,800,600)).toBe(null)
 expect(toolbarDock(20,5,800,600)).toBe('top')
 })
})
