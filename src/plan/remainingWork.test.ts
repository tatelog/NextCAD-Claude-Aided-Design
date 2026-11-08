import {expect,it} from 'vitest'
import {tributaryAreas,preliminarySections} from './preliminarySections'
import {entryChecks} from './entryChecks'
import type {AutoPlan} from './autoPlan'
import type {UnitPlan39} from './unitPlan39'
const unit=(start:number):UnitPlan39=>({id:'u',type:'test',envelope:{W:4000,D:4000,balcony_depth:0},rooms:[],doors:[{id:'e',kind:'玄関ドア',width:900,position:{orientation:'h',coord:0,start}}],fixtures:[],columns:[{id:'c',x:2000,y:2000}],windows:[]})
const plan={widthMm:9600,depthMm:4000,cells:[{id:'a',x0:0,x1:4000,y0:0,y1:4000},{id:'b',x0:5600,x1:9600,y0:0,y1:4000}],corridor:{id:'c',x0:4000,x1:5600,y0:0,y1:4000},unitPlanOverrides:{a:unit(1000),b:unit(2100)}} as unknown as AutoPlan
it('対向玄関の開閉範囲と残り幅を検出',()=>{const r=entryChecks(plan);expect(r.issues.some(s=>s.includes('重なる'))).toBe(true);expect(r.issues.some(s=>s.includes('700 mm'))).toBe(true)})
it('負担面積の合計が床面積と一致',()=>{expect(tributaryAreas([{x:1000,y:2000},{x:3000,y:2000}],[{x:0,y:0},{x:4000,y:0},{x:4000,y:4000},{x:0,y:4000}])).toEqual([8,8])})
it('荷重増加で断面候補を小さくしない・未入力を拒否',()=>{const input={floors:5,fc:24,ratio:.2,extraDead:2,live:1.8,slabMm:200};const a=preliminarySections(plan,input),b=preliminarySections(plan,{...input,floors:10});expect('side'in a&&'side'in b&&b.side>=a.side).toBe(true);expect(preliminarySections(plan,{...input,fc:0})).toHaveProperty('error')})
// 仕様（代表の決定 2026-11-08）: マンションの玄関の扉は外開きが普通なので、開く向きの指定が無ければ共用廊下側に開く扱いにする。
// 住戸の内側に開くと明示した扉だけ、内側に開く（廊下の開閉範囲として数えない）。
it('玄関の扉は、開く向きを住戸の内側と明示したときだけ内開き（廊下に重ならない）',()=>{const inward=(start:number):UnitPlan39=>({...unit(start),doors:[{id:'e',kind:'玄関ドア',width:900,swing_into:'ENT',position:{orientation:'h',coord:0,start}}]});const r=entryChecks({...plan,unitPlanOverrides:{a:inward(1000),b:inward(2100)}} as unknown as AutoPlan);expect(r.issues.some(s=>s.includes('重なる'))).toBe(false)})
