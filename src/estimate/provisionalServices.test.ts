import {it,expect} from 'vitest'
import {provisionalServices} from './provisionalServices'
import {standardSelections} from './standardSelections'
import {selectedPackageLines} from './specPackages'
import type {UnitPlan39} from '../plan/unitPlan39'
it('保存住戸の部屋数に応じて設備の仮数量を計上し、根拠と仮単価を残す',()=>{
 const p:UnitPlan39={id:'u',type:'2LDK',envelope:{W:10000,D:6000,balcony_depth:0},rooms:[{id:'L',name:'LDK',kind:'居室',x:0,y:0,w:4000,h:6000,area_m2:24},{id:'B',name:'洋室',kind:'居室',x:4000,y:0,w:3000,h:4000,area_m2:12}],fixtures:[],doors:[],windows:[],columns:[]}
 const rows=provisionalServices('1F/u',p,1)
 expect(rows.find(r=>r.part==='空調')?.quantity).toBe(2)
 expect(rows.find(r=>r.part==='分電盤')?.quantity).toBe(1)
 expect(rows.every(r=>r.basis?.includes('仮数量'))).toBe(true)
 expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length)
 const lines=selectedPackageLines(rows,standardSelections(rows,{},2400,2100))
 expect(lines).toHaveLength(rows.length)
 expect(lines.every(l=>l.amount!==null&&l.priceStatus==='仮値'&&l.basis.includes('仮数量'))).toBe(true)
})
