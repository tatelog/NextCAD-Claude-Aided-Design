import { expect, it } from 'vitest'
import { inheritedFloors } from './inheritedFloors'
it('位置・非矩形の外形・階数を保って引き継ぐ', () => {
 const footprint=[{x:100,y:200},{x:10100,y:200},{x:10100,y:10200},{x:5100,y:10200},{x:5100,y:5200},{x:100,y:5200}]
 const r=inheritedFloors({footprint,storey_count:3,storey_height:3000},[])
 expect(r?.floors).toHaveLength(3)
 expect(r?.floors[0]).toHaveLength(6)
 expect(r?.origin).toEqual({x:100,y:10200})
 expect(r?.floors[0]?.[0]).toEqual({x:0,y:10000})
 expect(inheritedFloors(null,[])).toBeNull()
})
it('斜線で減った上階を同一平面に複製しない',()=>{
 const r=inheritedFloors({footprint:[{x:0,y:0},{x:10000,y:0},{x:10000,y:10000},{x:0,y:10000}],storey_count:3,storey_height:3000},[{kind:'road',point:{x:0,y:0},inward:{x:0,y:1},coefficient:1,riseMm:0}])!
 expect(r.floors[0]).not.toEqual(r.floors[2])
})
