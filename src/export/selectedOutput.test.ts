import {it,expect} from 'vitest'
import {selectedOutputFiles} from './selectedOutput'
const f=(path:string)=>({path,text:path})
it('複数選択した分類だけ出力する',()=>{const out=selectedOutputFiles({drawings:true,documents:false,ifc:true},[f('平面.pdf')],[f('図書一覧.txt'),f('申請.docx')],[f('model.ifc')]);expect(out.map(f=>f.path)).toEqual(['図面/平面.pdf','IFC/model.ifc'])})
it('図書一覧には一覧と記入済み書類を含め、未選択なら空',()=>{expect(selectedOutputFiles({drawings:false,documents:true,ifc:false},[],[f('図書一覧.txt'),f('申請.docx')],[])).toHaveLength(2);expect(selectedOutputFiles({drawings:false,documents:false,ifc:false},[f('図.pdf')],[f('一覧.txt')],[f('model.ifc')])).toEqual([])})
