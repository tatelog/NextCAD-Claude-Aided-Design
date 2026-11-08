// 仕様: 保存階のみ変換する。元平面は変更しない。JSON/mesh/IFC/OBJ/結果を同時保存する。
import {describe,it,expect} from 'vitest'
import {exportSavedPlan} from './exportSavedPlan'
import type {AutoPlan} from '../../plan/autoPlan'
const plan={widthMm:10000,depthMm:20000,buildingOutline:[{x:0,y:0},{x:10000,y:0},{x:10000,y:20000},{x:0,y:20000}],cells:[],rooms:[],cores:[],voids:[],balconies:[]} as unknown as AutoPlan

describe('保存平面の一括出力',()=>{
 it('保存した2階だけを絶対高さ3000から変換し入力を保持する',()=>{
 const plans={2:structuredClone(plan)},before=JSON.stringify(plans)
 const out=exportSavedPlan({source:'saved-source',plans,storeyHeightMm:3000})
 expect(JSON.stringify(plans)).toBe(before)
 expect(out.model.storeys.map(s=>s.id)).toEqual(['floor-2'])
 expect(out.scene.meshes.some(m=>m.kind==='slab')).toBe(true)
 expect(Math.min(...out.scene.meshes.flatMap(m=>m.vertices.filter((_,i)=>i%3===2)))).toBe(3000)
 expect(out.files.map(f=>f.path)).toEqual(expect.arrayContaining(['intermediate.json','scene.json','model.ifc','model.obj','manifest.json']))
 expect(out.files.find(f=>f.path==='model.ifc')!.text).toContain('IFCSLAB')
 expect(out.files.find(f=>f.path==='model.obj')!.text).toContain('\nf ')
 expect(out.manifest.status).toBe('partial')
 })
 it('平面なしを外形モデルに自動代替しない',()=>expect(()=>exportSavedPlan({source:'',plans:{},storeyHeightMm:3000})).toThrow())
 it('階高不正を拒否する',()=>expect(()=>exportSavedPlan({source:'',plans:{1:plan},storeyHeightMm:0})).toThrow())
})
