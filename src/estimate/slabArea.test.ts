import {expect,it} from 'vitest'
import {slabAreaMm2} from './slabArea'
const outline=[{x:0,y:0},{x:10000,y:0},{x:10000,y:10000},{x:0,y:10000}]
const b={id:'b',x0:9000,y0:0,x1:11000,y1:10000}
it('室内とバルコニーの重なりは一度だけ数える',()=>expect(slabAreaMm2(outline,[b],[])).toBe(110000000))
it('重複したバルコニーと吹抜けも二重加算・控除しない',()=>{
 const v={id:'v',x0:4000,y0:4000,x1:6000,y1:6000}
 expect(slabAreaMm2(outline,[b,b],[v,v])).toBe(106000000)
})
it('外形外の吹抜けを引かず、離れた床も保持する',()=>{
 const distant={id:'d',x0:12000,y0:0,x1:13000,y1:1000}
 expect(slabAreaMm2(outline,[distant],[{id:'out',x0:20000,y0:0,x1:22000,y1:1000}])).toBe(101000000)
})
