import { expect,it } from 'vitest'
import { placementAllowed } from './placementGuard'
const rect=(x:number,y:number,w:number,h:number)=>[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}]
const lot=rect(0,0,10000,10000)
it('隣地から500mm以上のみ許可',()=>{expect(placementAllowed(lot,rect(500,0,9000,9500),0)).toBe(true);expect(placementAllowed(lot,rect(499,0,9000,9500),0)).toBe(false)})
it('道路側でも敷地外を拒否',()=>{expect(placementAllowed(lot,rect(1000,-1,2000,2000),0)).toBe(false)})
it('頂点が内部でも鍵型の欠けを跨ぐ形は拒否',()=>{const l=[{x:0,y:0},{x:10000,y:0},{x:10000,y:4000},{x:4000,y:4000},{x:4000,y:10000},{x:0,y:10000}];expect(placementAllowed(l,[{x:1000,y:1000},{x:9000,y:1000},{x:1000,y:9000}],0)).toBe(false)})
