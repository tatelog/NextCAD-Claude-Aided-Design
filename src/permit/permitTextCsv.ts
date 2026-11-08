import data from '../law/permitForms.json'
import type {FormDef,ValueMap} from '../law/permitFormPlan'
type TextField={id:string;form:string;face:string;label:string;field:string;sub?:string}
export const textFields:TextField[]=(data.forms as unknown as FormDef[]).flatMap(form=>form.faces.flatMap(face=>face.fields.flatMap<TextField>(field=>{
 const t=field.tokyo;if(!t||t.absent||t.in!=='paragraph'||/行政/.test(t.note??''))return []
 if(t.subitems?.length)return t.subitems.flatMap((sub,i)=>sub.place==='afterHeading'&&sub.in!=='tableCell'&&!/行政/.test(sub.note??'')?[{id:`${field.id}.CSV${i+1}`,form:form.id,face:face.title,label:`${field.label}：${sub.inlineHeading??sub.heading}`,field:field.id,sub:sub.inlineHeading??sub.heading}]:[])
 return t.place==='afterHeading'&&!/細目/.test(t.note??'')?[{id:field.id,form:form.id,face:face.title,label:field.label,field:field.id,sub:undefined}]:[]
})))
// 一覧・CSVの対象。自由文字として転記できない複合欄は INFO として保持する。
export const informationFields:TextField[]=(data.forms as unknown as FormDef[]).flatMap(form=>form.faces.flatMap(face=>face.fields.flatMap(field=>{
 if(field.tokyo?.absent||/行政/.test(field.tokyo?.note??'')||/^※|係員/.test(field.label))return []
 const text=textFields.filter(t=>t.field===field.id)
 return text.length?text:[{id:field.id+'.INFO',form:form.id,face:face.title,label:field.label,field:field.id}]
})))
export function informationValues(values:ValueMap):ValueMap {
 const result={...values}
 for(const field of informationFields){
  const direct=values[field.field]
  const parts=Object.entries(values).filter(([id,v])=>id.startsWith(field.field+'.')&&!/\.(CSV\d+|INFO)$/.test(id)&&!v.from.includes('サンプル'))
  if(field.id.endsWith('.INFO')){
   if(direct?.value.trim()&&!direct.from.includes('サンプル'))result[field.id]=direct
   else if(parts.length)result[field.id]={value:parts.map(([id,v])=>id.slice(field.field.length+1)+'：'+v.value).join(' ／ '),from:[...new Set(parts.map(([,v])=>v.from))].join('・')}
  }
 }
 return result
}
const headers=['項目ID','様式','面','項目名','入力値']
export function exportPermitTextCsv(values:ValueMap){return [headers,...informationFields.map(f=>[f.id,f.form,f.face,f.label,values[f.id]?.value??''])].map(r=>r.map(v=>'"'+v.replace(/"/g,'""')+'"').join(',')).join('\r\n')}
export function importPermitTextCsv(text:string):ValueMap{
 const rows:string[][]=[];let row:string[]=[],value='',quoted=false,closed=false
 text=text.replace(/^\uFEFF/,'')
 for(let i=0;i<text.length;i++){const c=text[i]!;if(quoted){if(c==='"'){if(text[i+1]==='"'){value+='"';i++}else{quoted=false;closed=true}}else value+=c}else if(c==='"'){if(value||closed)throw Error('CSVの引用符が不正です');quoted=true}else if(c===','||c==='\n'||c==='\r'){row.push(value);value='';closed=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(Boolean))rows.push(row);row=[]}}else{if(closed)throw Error('CSVの引用符の後に文字があります');value+=c}}
 if(quoted)throw Error('CSVの引用符が閉じていません');if(value||row.length){row.push(value);rows.push(row)}
 const header=rows.shift();if(!header||header.join('|')!==headers.join('|'))throw Error('専用テンプレートの列名・順序を使用してください')
 const values:ValueMap={},seen=new Set<string>();for(const r of rows){const id=r[0]!;if(r.length!==headers.length||!informationFields.some(f=>f.id===id)||seen.has(id))throw Error(`項目ID・列数が不正、または重複しています：${id}`);seen.add(id);if(r[4]!.length>4000)throw Error('入力値は4000文字以内にしてください');if(r[4]!.trim())values[id]={value:r[4]!,from:/サンプル|架空/.test(r[4]!)?'サンプル（架空）':'申請情報CSV'}}return values
}

/** 動作確認用の架空情報。実在の個人・住所・資格番号は含めない。 */
export function samplePermitTextValues():ValueMap {
 const samples:Record<string,string>={
  'F2-1-02':'サンプル 太郎（架空）',
  'F8-1-02':'サンプル 太郎（架空）',
  'F8E-1-02':'サンプル 太郎（架空）',
  'F2-2-01.CSV1':'サンプル タロウ',
  'F2-2-01.CSV2':'サンプル 太郎（架空）',
  'F2-2-01.CSV3':'000-0000',
  'F2-2-01.CSV4':'サンプル県サンプル市サンプル町1-2-3（架空）',
  'F2-2-01.CSV5':'000-0000-0000',
  'F2-2-02.CSV2':'サンプル 花子（架空）',
  'F2-2-02.CSV4':'000-0000',
  'F2-2-02.CSV5':'サンプル県サンプル市設計町4-5-6（架空）',
  'F2-2-02.CSV6':'000-0000-0000',
 }
 return Object.fromEntries(informationFields.map(f=>{
 const label=f.label
 const value=samples[f.id]??(/年月日/.test(label)?'2030年4月1日（サンプル）':/郵便/.test(label)?'000-0000（サンプル）':/電話/.test(label)?'000-0000-0000（サンプル）':/住所|所在地|住居表示|地名/.test(label)?'サンプル県サンプル市1-2-3（架空）':/氏名|建築主|設計者|施工者|監理者|代理者/.test(label)?'サンプル担当者（架空）':/備考|その他/.test(label)?'動作確認用サンプル（架空）':label+'：サンプル情報（架空・未確認）')
 return [f.id,{value,from:'サンプル（架空）'}]
 }))
}
