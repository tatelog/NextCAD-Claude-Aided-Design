import {it,expect} from 'vitest'
import {combinedOutputFiles} from './combinedOutput'
it('図面・書類・データを一式にし、不足一覧を残す',()=>{
 const files=combinedOutputFiles([{path:'1階.svg',text:'<svg/>'}],[{path:'申請.docx',text:'',bytes:new Uint8Array([1,2])}],[{path:'model.ifc',text:'IFC'}],['日影図：未作成'])
 expect(files.map(f=>f.path)).toEqual(['図面/1階.svg','書類/申請.docx','データ/model.ifc','出力一覧.txt'])
 expect(files[1]?.bytes).toEqual(new Uint8Array([1,2]));expect(files[3]?.text).toContain('日影図：未作成')
})
