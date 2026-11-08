import {useState,type ReactNode} from 'react'
import data from '../law/permitForms.json'
import {informationFields,informationValues} from '../permit/permitTextCsv'
import type {FormDef,ValueMap} from '../law/permitFormPlan'
import {usePermitForms} from '../store/permitForms'

export function PermitInformationTile({values,children}:{values:ValueMap;children:ReactNode}){
 const [open,setOpen]=useState(false)
 const forms=usePermitForms(s=>s.forms)
 const kinds=new Set(['F2','F3',...Object.keys(forms)])
 const effective=informationValues(values)
 const definitions=data.forms as unknown as FormDef[]
 const rows=informationFields.filter(f=>kinds.has(f.form)).map(f=>({...f,form:definitions.find(d=>d.id===f.form)?.name??f.form,value:effective[f.id]?.value??'',source:effective[f.id]?.from??''}))
 const filled=rows.filter(r=>r.value.trim()).length
 return <details id="permit-project-review" onToggle={e=>setOpen(e.currentTarget.open)} style={{border:'1px solid #cbd6e5',borderRadius:8,padding:12,marginBottom:16,background:'#f7f9fc'}}>
  <summary style={{cursor:'pointer',fontWeight:600}}>出力に必要な情報 <span style={{display:'block',fontSize:20,marginTop:6}}>入力済み {filled}件／対象 {rows.length}件</span></summary>
  {open&&<><p style={{fontSize:12}}>第二号・第三号と添付済み様式の項目一覧です。行政記入欄は除きます。サンプルを含む件数は値の有無を示し、書類の完成判定ではありません。</p><div style={{maxHeight:360,overflow:'auto'}}><table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}><thead><tr><th>項目</th><th>入力内容</th><th>状態</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td style={{padding:6,borderBottom:'1px solid #dce3ed'}}>{r.label}<small style={{display:'block',color:'#667'}}>{r.form}・{r.face}</small></td><td style={{padding:6,borderBottom:'1px solid #dce3ed',overflowWrap:'anywhere'}}>{r.value||'—'}{r.source&&<small style={{display:'block',color:'#667'}}>{r.source}</small>}</td><td style={{padding:6,borderBottom:'1px solid #dce3ed',whiteSpace:'nowrap'}}>{r.source.includes('サンプル')?'サンプル':r.value.trim()?'入力済み':'未入力'}</td></tr>)}</tbody></table></div></>}
  <div hidden={!open}>{children}</div>
 </details>
}
