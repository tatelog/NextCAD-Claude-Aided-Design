import {it,expect} from 'vitest'
import {standardSelections} from './standardSelections'
import {selectedPackageLines} from './specPackages'
it('概算を許可した場合だけ寸法未確定の水回りと窓を仮仕様で計上する',()=>{
 const objects=[{id:'k',part:'キッチン',quantity:1,unit:'台',widthMm:2600},{id:'ub',part:'ユニットバス',quantity:1,unit:'台'},{id:'w',part:'窓',quantity:null,unit:'m2'}]
 const selected=standardSelections(objects,{},2400,2100,true)
 const lines=selectedPackageLines(objects,selected)
 expect(lines).toHaveLength(3)
 expect(lines.every(l=>l.amount!==null&&l.basis.includes('仮仕様'))).toBe(true)
 expect(lines.find(l=>l.objectId==='w')?.quantity).toBeCloseTo(2.16)
 const saved={...selected.k!,quantity:2}
 expect(standardSelections(objects,{k:saved},2400,2100,true).k).toBe(saved)
})
