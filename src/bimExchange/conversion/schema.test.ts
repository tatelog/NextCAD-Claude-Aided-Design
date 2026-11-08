import { it, expect } from 'vitest'
import { IfcAPI, IFCWALL, IFCCOLUMN, IFCBEAM, IFCSLAB, IFCOPENINGELEMENT, IFCOWNERHISTORY } from 'web-ifc'
import { intermediateToIfc } from './index'
import type { IntermediateModel, Element } from './types'
const geometry={type:'extrudedPolygon' as const,outer:[{x:0,y:0},{x:3000,y:0},{x:3000,y:200},{x:0,y:200}],holes:[],zMm:3000,heightMm:3000}
const elements:Element[]=(['wall','column','beam','slab','balcony','opening'] as const).map(kind=>({id:kind,kind,storeyId:'2F',geometry,source:{elementIds:[`元-${kind}`],origin:'plan'},status:'confirmed',...(kind==='opening'?{hostElementId:'wall',geometry:{...geometry,outer:[{x:1000,y:0},{x:2000,y:0},{x:2000,y:200},{x:1000,y:200}],zMm:4000,heightMm:1000}}:{})}))
const model:IntermediateModel={schemaVersion:'bim-intermediate/1',units:'mm',coordinateSystem:'right-handed-z-up',storeys:[{id:'2F',name:'2階',elevationMm:3000,heightMm:3000}],elements,issues:[]}
it.each(['IFC4','IFC2X3'] as const)('%sの属性数と必須OwnerHistoryをスキーマに合わせる',async schema=>{
 const result=intermediateToIfc(model,schema);expect(result.issues).toEqual([])
 const api=new IfcAPI();await api.Init();const id=api.OpenModel(new TextEncoder().encode(result.ifcText))
 try {
  expect(api.GetModelSchema(id)).toBe(schema)
  for(const type of [IFCWALL,IFCCOLUMN,IFCBEAM,IFCOPENINGELEMENT,IFCSLAB]){const refs=api.GetLineIDsWithType(id,type);expect(refs.size()).toBeGreaterThan(0);for(let i=0;i<refs.size();i++)expect(api.GetRawLineData(id,refs.get(i)).arguments).toHaveLength(schema==='IFC2X3'&&type!==IFCSLAB?8:9)}
  if(schema==='IFC2X3'){
   const owners=api.GetLineIDsWithType(id,IFCOWNERHISTORY);expect(owners.size()).toBe(1);const ownerId=owners.get(0),owner=api.GetLine(id,ownerId);expect(owner.ChangeAction.value).toBe('ADDED');expect(owner.CreationDate.value).toBeGreaterThan(0);expect(api.GetLine(id,owner.OwningUser.value).ThePerson.value).toBeGreaterThan(0);expect(api.GetLine(id,owner.OwningApplication.value).ApplicationIdentifier.value).toBe('BIMExchange')
   const lines=api.GetAllLines(id);for(let i=0;i<lines.size();i++){const line=api.GetLine(id,lines.get(i));if('GlobalId' in line)expect(line.OwnerHistory.value).toBe(ownerId)}
  }
 }finally{api.CloseModel(id);api.Dispose()}
})
it('既定はIFC4、未対応schemaは拒否する',()=>{expect(intermediateToIfc(model).ifcText).toContain("FILE_SCHEMA(('IFC4'))");expect(()=>intermediateToIfc(model,'IFC9' as 'IFC4')).toThrow()})
