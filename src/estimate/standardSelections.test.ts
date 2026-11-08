import {expect,it} from 'vitest'
import {standardSelections} from './standardSelections'
import {selectedPackageLines} from './specPackages'
it('部屋の実面積と間仕切り実長から標準仕様の数量と金額を計算する',()=>{
 const objects=[{id:'床',part:'床',name:'洋室',quantity:12,unit:'m2'},{id:'壁',part:'壁',quantity:null,unit:'m2',lengthMm:4000,openingWidthMm:800}]
 const selected=standardSelections(objects,{},2400,2100)
 const lines=selectedPackageLines(objects,selected)
 expect(lines[0]?.quantity).toBe(12)
 expect(lines[0]?.amount).toBe(114000)
 expect(lines[1]?.quantity).toBeCloseTo(7.92)
 expect(lines[1]?.amount).toBe(95040)
})
it('既存の選定と単価を上書きせず、寸法不一致の什器は自動選定しない',()=>{
 const previous={床:{packageId:'PKG-015',version:'saved'}}
 const result=standardSelections([{id:'床',part:'床',quantity:12,unit:'m2'},{id:'K',part:'キッチン',quantity:1,unit:'台',widthMm:2600,depthMm:600}],previous,2400,2100)
 expect(result.床).toBe(previous.床)
 expect(result.K).toBeUndefined()
})
