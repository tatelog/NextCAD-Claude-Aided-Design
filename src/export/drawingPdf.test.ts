import {describe,it,expect} from 'vitest'
import {drawingPdfFiles} from './drawingPdf'

describe('図面PDFの一括保存',()=>{
 it('各図面をPDFのバイト列に変換し元のSVGを同梱しない',async()=>{
  const calls:string[][]=[]
  const bytes=new TextEncoder().encode('%PDF-1.7\n')
  const files=await drawingPdfFiles([{path:'配置図.svg',text:'<svg/>'},{path:'1階平面図.svg',text:'<svg id="floor"/>'}],async svgs=>{calls.push(svgs);return bytes})
  expect(files.map(f=>f.path)).toEqual(['配置図.pdf','1階平面図.pdf'])
  expect(files.every(f=>f.text===''&&f.bytes===bytes)).toBe(true)
  expect(calls).toEqual([['<svg/>'],['<svg id="floor"/>']])
 })
 it('変換失敗をSVGへの代替で隠さない',async()=>{
  await expect(drawingPdfFiles([{path:'配置図.svg',text:'<svg/>'}],async()=>{throw new Error('変換失敗')})).rejects.toThrow('変換失敗')
 })
})
