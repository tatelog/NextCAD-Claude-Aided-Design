import {describe,it,expect} from 'vitest'
import {floorAreaGeometry,floorAreaSheet} from './additionalSheets'
import {sampleFloorPlans} from '../bimExchange/intermediate/fixtures'
describe('床面積求積',()=>{
 it('保存輪郭から吹抜けを控除し、バルコニーを加えない',()=>{const p=sampleFloorPlans().plans[2]!;expect(floorAreaGeometry(p)).toMatchObject({gross:9,net:8,excluded:1});expect(floorAreaSheet(p,2)).toContain('8.000')})
 it('重複吹抜けと輪郭外を二重控除しない',()=>{const p=sampleFloorPlans().plans[2]!;p.voids=[{id:'a',x0:1000,y0:1000,x1:2000,y1:2000},{id:'b',x0:1000,y0:1000,x1:4000,y1:2000}];expect(floorAreaGeometry(p).net).toBe(7)})
 it('凹形輪郭と逆順に対応する',()=>{const p=sampleFloorPlans().plans[2]!;p.voids=[];p.buildingOutline=[{x:0,y:0},{x:3000,y:0},{x:3000,y:1000},{x:1000,y:1000},{x:1000,y:3000},{x:0,y:3000}];expect(floorAreaGeometry(p).net).toBe(5);p.buildingOutline=[...p.buildingOutline].reverse();expect(floorAreaGeometry(p).net).toBe(5)})
})
