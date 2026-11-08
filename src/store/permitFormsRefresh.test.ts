import { it, expect } from 'vitest'
import { usePermitForms } from './permitForms'
it('様式差替え時は旧書類を保存対象に残さない',()=>{
 const s=usePermitForms.getState();s.setFilled('F2','旧.docx',new Uint8Array([1]));s.importForm('F2','新.docx',new Uint8Array([2]),[]);expect(usePermitForms.getState().filled.F2).toBeUndefined()
})
it('様式削除時は記入済み書類も除く',()=>{
 const s=usePermitForms.getState();s.setFilled('F2','旧.docx',new Uint8Array([1]));s.removeForm('F2');expect(usePermitForms.getState().filled.F2).toBeUndefined()
})
