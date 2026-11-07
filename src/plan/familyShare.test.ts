import {it,expect} from 'vitest'
import {familyShare,familyShareIssue,currentFamilyShare} from './familyShare'
const types=[{id:'family',ldk:1,bedrooms:2},{id:'single',ldk:0,bedrooms:1}]
const plans={1:{cells:[{id:'a'},{id:'b'}],unitTypeIdsByCell:{a:'family',b:'single',deleted:'family'}}}
it('残った住戸だけを分母・分子に使う',()=>expect(familyShare(plans,types)).toBe(.5))
it('元の割合以上を必要とし、戸数増加による希釈を拒否する',()=>{
 expect(familyShareIssue(plans,types,.5)).toBeNull()
 expect(familyShareIssue({...plans,2:{cells:[{id:'c'}],unitTypeIdsByCell:{c:'single'}}},types,.5)).toContain('ファミリー住戸の割合')
})
it('不正な割合と住戸のない候補を成立扱いしない',()=>{
 expect(()=>familyShareIssue(plans,types,1.1)).toThrow()
 expect(familyShareIssue({},types,.5)).not.toBeNull()
})
it('同じボリュームの編集済み平面を確認時の古い構成より優先する',()=>{
 const edited={1:{cells:[{id:'a'}],unitTypeIdsByCell:{a:'family'}}}
 expect(currentFamilyShare({source:'v',plans:edited},{source:'v',plans},'v',types)).toBe(1)
 expect(currentFamilyShare({source:'old',plans:edited},{source:'v',plans},'v',types)).toBe(.5)
 expect(currentFamilyShare({source:'old',plans:edited},{source:'old',plans},'v',types)).toBeNull()
})
