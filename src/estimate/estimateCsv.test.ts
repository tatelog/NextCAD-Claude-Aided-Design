import {it,expect} from 'vitest'
import {exportObjectSpecs,importObjectSpecs,exportMaterialCsv,importMaterialCsv,applyMaterialPrices} from './estimateCsv'
import {changePackage,packageLine,type SpecObject} from './specPackages'
import {PRICE_CSV_SAMPLE} from '../store/priceTable'
const objects:SpecObject[]=[{id:'floor-1',part:'床',unit:'m2',quantity:10,name:'床,「標準」\n1階'}]
const selections={'floor-1':changePackage(undefined,'PKG-014')}
it('オブジェクト仕様CSVは引用符・改行を含め往復できる',()=>{expect(importObjectSpecs(exportObjectSpecs(objects,selections),objects,selections)).toEqual(selections)})
it('不明ID・重複・負の数量を受け付けず元データを変更しない',()=>{
 const csv=exportObjectSpecs(objects,selections)
 expect(()=>importObjectSpecs(csv.replace('floor-1','unknown'),objects,selections)).toThrow()
 expect(()=>importObjectSpecs(csv+'\n'+csv.split('\n').slice(1).join('\n'),objects,selections)).toThrow()
 expect(selections['floor-1'].packageId).toBe('PKG-014')
})
it('材料CSVを往復し、仕様単価の変更を同じ仕様の部材金額へ反映する',()=>{
 const csv=exportMaterialCsv(PRICE_CSV_SAMPLE,{})
 const imported=importMaterialCsv(csv)
 expect(imported.priceCsv).toContain('壁クロス')
 imported.packagePrices['PKG-014']={value:1234,status:'仮値',source:'試験',url:'',date:'',region:'',scope:'床仕上げ'}
 const next=applyMaterialPrices(selections,imported.packagePrices)
 expect(packageLine(objects[0]!,next['floor-1']!.packageId,next['floor-1']).amount).toBe(12340)
 expect(selections['floor-1'].price).toBeUndefined()
 expect(()=>importMaterialCsv(csv.replace('1200','-1'))).toThrow()
})

it('負の数量・異なる仕様版・不正CSVを拒否する',()=>{
 const simple=[{...objects[0]!,name:'床'}]
 const csv=exportObjectSpecs(simple,selections)
 const edit=(column:number,value:string)=>{const lines=csv.split('\r\n');const row=lines[1]!.split(',');row[column]=`"${value}"`;return lines[0]+'\r\n'+row.join(',')}
 expect(()=>importObjectSpecs(edit(5,'-1'),simple,selections)).toThrow()
 expect(()=>importObjectSpecs(edit(4,'old'),simple,selections)).toThrow()
 expect(()=>importObjectSpecs(csv+'"',simple,selections)).toThrow()
 const material=exportMaterialCsv(PRICE_CSV_SAMPLE,{})
 expect(()=>importMaterialCsv(material+'\r\n'+material.split('\r\n')[1])).toThrow()
})
it('個別単価は材料DBより優先する',()=>{
 const price={value:500,status:'仮値' as const,source:'試験',url:'',date:'',region:'',scope:'床'}
 const s={'floor-1':{...selections['floor-1'],price}}
 expect(applyMaterialPrices(s,{'PKG-014':{...price,value:900}})['floor-1']!.price!.value).toBe(500)
})
