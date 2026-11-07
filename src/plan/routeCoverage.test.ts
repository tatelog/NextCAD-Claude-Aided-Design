import {it,expect} from 'vitest'
import {routeCovered} from './routeCoverage'
const route=[{x:500,y:500},{x:500,y:9500}]
it('通路の途中の隙間を見落とさない',()=>{expect(routeCovered(route,[{x0:0,x1:1000,y0:0,y1:5000},{x0:0,x1:1000,y0:5001,y1:10000}],600)).toBe(false)})
it('中心線が通れても必要幅未満なら不成立',()=>{expect(routeCovered(route,[{x0:250,x1:750,y0:0,y1:10000}],600)).toBe(false)})
it('連続する矩形の継ぎ目と曲がりを通れる',()=>{expect(routeCovered([{x:500,y:500},{x:500,y:5000},{x:4500,y:5000}],[{x0:0,x1:1000,y0:0,y1:5500},{x0:1000,x1:5000,y0:4500,y1:5500}],600)).toBe(true)})
it('斜めの経路を未検査で通さない',()=>{expect(routeCovered([{x:0,y:0},{x:1000,y:1000}],[{x0:0,x1:2000,y0:0,y1:2000}],600)).toBe(false)})
