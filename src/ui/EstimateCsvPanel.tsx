import {useState} from 'react'
import {exportObjectSpecs,importObjectSpecs,exportMaterialCsv,importMaterialCsv} from '../estimate/estimateCsv'
import type {SpecObject,SpecSelection} from '../estimate/specPackages'
import {usePriceTable} from '../store/priceTable'
import {useSpecSelections} from '../store/specSelections'
function download(name:string,text:string){const url=URL.createObjectURL(new Blob(['\uFEFF',text],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export function EstimateCsvPanel({objects,selections}:{objects:SpecObject[];selections:Record<string,SpecSelection>}){
 const [message,setMessage]=useState(''),[error,setError]=useState('')
 const run=(fn:()=>void)=>{try{setError('');fn()}catch(e){setError(e instanceof Error?e.message:String(e))}}
 const read=async(file:File|undefined,kind:'objects'|'materials')=>{if(!file)return;try{setError('');setMessage('');if(file.size>10*1024*1024)throw Error('CSVは10MB以内にしてください');const csv=await file.text();if(kind==='objects'){const next=importObjectSpecs(csv,objects,selections);useSpecSelections.setState({selections:next})}else{const next=importMaterialCsv(csv);usePriceTable.getState().setDatabase(next.priceCsv,next.packagePrices)}setMessage('CSVを反映しました')}catch(e){setError(e instanceof Error?e.message:String(e))}}
 return <details><summary>データ管理（CSV）</summary>
 <p style={{fontSize:12}}>仕様は登録済みの標準仕様を使用します。変更するときはCSVを書き出して編集し、取り込んでください。</p>
 <div><strong>オブジェクト別仕様</strong><p style={{fontSize:12}}>部材IDごとの仕様ID・数量条件・個別単価。単価の空欄は材料DBを参照します。</p><button onClick={()=>run(()=>download('オブジェクト別仕様.csv',exportObjectSpecs(objects,selections)))}>仕様CSVを書き出す</button><label style={{display:'block'}}>仕様CSVを取り込む<input aria-label="仕様CSVを取り込む" type="file" accept=".csv,text/csv" onChange={e=>{void read(e.target.files?.[0],'objects');e.target.value=''}}/></label></div>
 <div style={{marginTop:12}}><strong>材料・単価DB</strong><p style={{fontSize:12}}>材料・労務単価と標準仕様の単価。ブラウザに保存し、新しい部材にも適用します。個別単価がある部材は個別指定を優先します。</p><button onClick={()=>run(()=>{const s=usePriceTable.getState();download('材料単価DB.csv',exportMaterialCsv(s.csv,s.packagePrices??{}))})}>材料CSVを書き出す</button><label style={{display:'block'}}>材料CSVを取り込む<input aria-label="材料CSVを取り込む" type="file" accept=".csv,text/csv" onChange={e=>{void read(e.target.files?.[0],'materials');e.target.value=''}}/></label></div>
 {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}。取り込みは反映していません。</p>}
 </details>
}
