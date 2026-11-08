import {describe,it,expect} from 'vitest'
import {resolvePermitProject} from './resolvePermitProject'
const manual={inShadowRegulationArea:null,structuralCalc:null,hasAgent:null,bimSubmission:null,usesCertifiedParts:null,hasBuildingEquipment:null,hasElevator:null}
describe('申請条件の設計データ引継ぎ',()=>{
 it('平面の昇降機と設備を反映し手入力で打ち消さない',()=>{
 const r=resolvePermitProject({...manual,hasElevator:false,hasBuildingEquipment:false},{elevator:true,equipment:true,shadowChecked:true})
 expect(r.project.hasElevator).toBe(true);expect(r.project.hasBuildingEquipment).toBe(true);expect(r.project.inShadowRegulationArea).toBe(true)
 expect(r.project.structuralCalc).toBeNull();expect(r.project.hasAgent).toBeNull()
 })
 it('配置未作成や設備未検出を「なし」と決めない',()=>{const r=resolvePermitProject(manual,{elevator:null,equipment:null,shadowChecked:false});expect(r.project).toEqual(manual)})
 it('全階でEVなしが確認できる場合はなしを引き継ぐ',()=>{expect(resolvePermitProject(manual,{elevator:false,equipment:null,shadowChecked:false}).project.hasElevator).toBe(false)})
})
