import {detailedFloorSvg} from '../export/designSheets'
import {expect,it} from 'vitest'
import {prepareVolumePlan} from './volumePlan'
const overlap=(a:any,b:any)=>Math.min(a.x1,b.x1)>Math.max(a.x0,b.x0)&&Math.min(a.y1,b.y1)>Math.max(a.y0,b.y0)
it('ツインは外周側の住戸と２本の廊下、吹抜け、両端の連絡通路を全階へ引き継ぐ',()=>{
 const volume={footprint:[{x:0,y:0},{x:26000,y:0},{x:26000,y:66500},{x:0,y:66500}],storey_count:5,storey_height:3000}
 const {plans}=prepareVolumePlan(volume,[],{layout:'ツイン',span:3000,corridor:1600,unitDepth:7000})
 const p=plans[1]!
 expect(p.cells.length).toBeGreaterThan(0)
 expect(Object.values(p.unitTypeIdsByCell??{}).some(id=>id==='T-08-2LDK'&&p.cells.some(c=>p.unitTypeIdsByCell?.[c.id]===id))).toBe(true)
 expect(p.corridors).toHaveLength(2)
 expect(p.bridges?.map(b=>b.id)).toEqual(expect.arrayContaining(['bridge-a','bridge-b','ev-lobby']))
 expect(p.voids!.length).toBeGreaterThan(0)
 for(const cell of p.cells){
  expect([...p.corridors!,...p.bridges!,...p.voids!,...p.cores].some(r=>overlap(cell,r))).toBe(false)
  expect(p.corridors!.some(r=>Math.abs(cell.x1-r.x0)<1||Math.abs(cell.x0-r.x1)<1)).toBe(true)
 }
 const walking=[...p.corridors!,...p.bridges!,...p.cores]
 for(const route of p.circulation!.routes)for(let i=1;i<route.length;i++)for(let t=0;t<=1;t+=.05){
  const a=route[i-1]!,b=route[i]!,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t
  expect(walking.some(r=>x>=r.x0-.01&&x<=r.x1+.01&&y>=r.y0-.01&&y<=r.y1+.01)).toBe(true)
  expect(p.voids!.some(r=>x>r.x0&&x<r.x1&&y>r.y0&&y<r.y1)).toBe(false)
 }
 expect(detailedFloorSvg(p,1)).toContain('吹抜け（床なし）')
 expect(plans[5]!.cores).toEqual(p.cores)
 expect(plans[5]!.voids).toEqual(p.voids)
},60000)

it('幅が足りないツインは成立扱いにしない',()=>{
 const volume={footprint:[{x:0,y:0},{x:12000,y:0},{x:12000,y:40000},{x:0,y:40000}],storey_count:5,storey_height:3000}
 expect(()=>prepareVolumePlan(volume,[],{layout:'ツイン',span:3000,corridor:1600,unitDepth:7000})).toThrow()
})
