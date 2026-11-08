import {describe,it,expect} from 'vitest'
import {stairLocation} from './stairLocation'
const outline=[{x:0,y:0},{x:10000,y:0},{x:10000,y:10000},{x:0,y:10000}]
describe('階段の内外判定',()=>{
 it('境界に接していても全体が内部なら内部',()=>expect(stairLocation({x0:0,y0:0,x1:2000,y1:4000},outline)).toBe('内部階段'))
 it('一部でも外に出れば外部',()=>expect(stairLocation({x0:-100,y0:0,x1:2000,y1:4000},outline)).toBe('外部階段'))
 it('凹部をまたぐ階段は四隅が内側でも外部',()=>expect(stairLocation({x0:1000,y0:1000,x1:9000,y1:9000},[{x:0,y:0},{x:10000,y:0},{x:10000,y:10000},{x:6000,y:10000},{x:6000,y:5000},{x:4000,y:5000},{x:4000,y:10000},{x:0,y:10000}])).toBe('外部階段'))
 it('外形がない場合は未判定',()=>expect(stairLocation({x0:0,y0:0,x1:2000,y1:4000},[])).toBe(null))
})
