import './PermitFormImport.css'
import {useRef,useState} from 'react'
import {exportPermitTextCsv,importPermitTextCsv,samplePermitTextValues,informationValues} from '../permit/permitTextCsv'
import {usePermitText} from '../store/permitText'
import {usePermitForms} from '../store/permitForms'
import data from '../law/permitForms.json'
import type {FormDef} from '../law/permitFormPlan'
import {fillInstructionsOf} from '../law/permitFormFill'
export function PermitTextCsv({designValues={}}:{designValues?:import('../law/permitFormPlan').ValueMap}){
 const input=useRef<HTMLInputElement>(null),[dragging,setDragging]=useState(false)
 const [showImport,setShowImport]=useState(()=>Object.keys(usePermitText.getState().values).length===0)
 const values=usePermitText(s=>s.values),[error,setError]=useState(''),[message,setMessage]=useState('')
 const download=()=>{const url=URL.createObjectURL(new Blob(['\uFEFF',exportPermitTextCsv(informationValues({...values,...designValues}))],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='申請文字情報.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 const read=async(file:File|undefined)=>{if(!file)return;setError('');setMessage('');try{if(!/\.csv$/i.test(file.name))throw Error('CSVファイルを選んでください');if(file.size>2*1024*1024)throw Error('CSVは2MB以内にしてください');const next=importPermitTextCsv(await file.text());let hasUnwritten=false;const forms=usePermitForms.getState().forms;for(const def of data.forms as unknown as FormDef[]){const f=forms[def.id as keyof typeof forms];if(!f)continue;const own=Object.fromEntries(Object.entries(next).filter(([id])=>id.startsWith(def.id+'-')&&!id.endsWith('.INFO')));const plan=fillInstructionsOf(def,f.paragraphs,own);if(plan.unwritten.length)hasUnwritten=true}usePermitText.getState().setValues(next);setShowImport(false);setMessage(hasUnwritten?'文字情報を取り込みました。Wordに転記できない欄があります。記入内容の一覧で確認してください。':'文字情報を取り込みました。添付済みのWordへ自動転記します。')}catch(e){setError((e instanceof Error?e.message:String(e))+'。変更は反映していません。')}}
 return <section aria-label="申請文字情報CSV"><h3>申請者・設計者などの文字情報</h3><p style={{fontSize:12}}>テンプレートの「入力値」に必要な情報を記入して取り込んでください。氏名・住所と設計情報を一覧で扱います。INFO項目は一覧用で、Wordへの直接転記は未対応です。設計から取得した値を優先し、行政記入欄は対象外です。</p><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button onClick={download}>申請情報CSVをダウンロード</button><button type="button" onClick={()=>{usePermitText.getState().setValues(samplePermitTextValues());setError('');setShowImport(false);setMessage('全項目のサンプルを取り込みました。設計情報を優先し、対応済みの欄をWordへ転記します。')}}>サンプルデータの取り込み</button></div><p style={{fontSize:12,margin:'6px 0'}}>サンプルは架空の情報です。取り込むと現在の文字情報を置き換えます。</p>{!showImport&&<p><span>文字情報：取り込み済み </span><button type="button" onClick={()=>setShowImport(true)}>CSVを差し替える</button></p>}<div hidden={!showImport} aria-label="申請情報CSVのドロップ領域" onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';setDragging(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setDragging(false)}} onDrop={e=>{e.preventDefault();setDragging(false);if(e.dataTransfer.files.length!==1){setError('CSVファイルを1つずつ取り込んでください');return}void read(e.dataTransfer.files[0])}} className={`permit-dropzone${dragging?' is-dragging':''}`}>
 <svg width="28" height="32" viewBox="0 0 28 32" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 1h12l6 6v24H5zM17 1v7h6M14 12v12m-5-5 5 5 5-5"/></svg>
 <p className="permit-dropzone-title">申請情報CSVをここにドロップ</p><button type="button" onClick={()=>input.current?.click()}>またはCSVファイルを選ぶ</button>
 <input ref={input} aria-label="申請情報CSVを取り込む" type="file" accept=".csv,text/csv" style={{display:'none'}} onChange={e=>{void read(e.target.files?.[0]);e.target.value=''}}/>
 </div><p style={{fontSize:12}}>取り込みはCSVの内容で置き換えます。空欄は転記しません。文字情報はこの画面を閉じるまで保持し、保管にはCSVを使用してください。</p>{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}</section>
}
