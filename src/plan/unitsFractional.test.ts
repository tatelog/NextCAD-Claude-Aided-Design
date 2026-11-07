import {it,expect} from 'vitest'
import {countUnits} from './units'
it('面積保存の自動変形で生じる小数mmの区画を扱う',()=>{expect(countUnits({outline:[{x:0,y:0},{x:8000,y:0},{x:8000,y:10000},{x:0,y:10000}],corridors:[{id:'c',x0:6000,y0:0,x1:8000,y1:10000}],cores:[],cells:[{id:'u',x0:123.45,y0:0,x1:6000,y1:6789.123}]}).usable_count).toBe(1)})
