import type {PermitProject} from '../law/permitInput'
export function resolvePermitProject(manual:PermitProject,derived:{elevator:boolean|null;equipment:boolean|null;shadowChecked:boolean}){
 const inherited:Partial<Record<keyof PermitProject,string>>={}
 const project={...manual}
 if(derived.elevator!==null){project.hasElevator=derived.elevator;inherited.hasElevator='保存済みの各階平面'}
 if(derived.equipment!==null){project.hasBuildingEquipment=derived.equipment;inherited.hasBuildingEquipment='平面の設備配置（積算数量と共通）'}
 if(derived.shadowChecked){project.inShadowRegulationArea=true;inherited.inShadowRegulationArea='ボリュームの日影規制判定'}
 return {project,inherited}
}
