import {recordPage} from './recordPage'
import {RecordPagination} from './RecordPagination'
import {standardSelections} from '../estimate/standardSelections'
import {useState} from 'react'
import './SpecPackagePanel.css'
import {changePackage,packageOptions,packageLine,type SpecObject,type SpecSelection} from '../estimate/specPackages'
import {useSpecSelections} from '../store/specSelections'

export function SpecPackagePanel({objects}:{objects:SpecObject[]}) {
 const selections=useSpecSelections(s=>s.selections),set=useSpecSelections(s=>s.set)
 const [part,setPart]=useState(''),[floor,setFloor]=useState(''),[active,setActive]=useState('')
 const shown=objects.filter(o=>(!part||o.part===part)&&(!floor||String(o.floor)===floor))
 const [page,setPage]=useState(0)
 const visible=recordPage(shown,page)
 const object=objects.find(o=>o.id===active), selection=object?selections[object.id]:undefined
 const change=(patch:Partial<SpecSelection>)=>{if(object&&selection)set(object.id,{...selection,...patch})}
 const choose=(o:SpecObject,id:string)=>set(o.id,id?changePackage(selections[o.id],id):null)
 const stale=Object.keys(selections).filter(id=>!objects.some(o=>o.id===id))
 return <section aria-label="部材の仕様パッケージ" style={{padding:12,border:'1px solid #9ebdb9',marginBottom:16}}>
  <h3>部材の仕様と見積</h3>
  <p>下地・取付を含む標準案です。金額は税別。公表資料の労務単価だけを施工込み価格として扱いません。選択内容は案件の「保存」に含まれます。</p>
  <p role="status">数量・単価の未確定項目は下表に「未計上」と表示し、合計には含めません。登録済み価格は仮単価です。</p>
  <p>未作図の住戸設備は仮仕様・仮数量で概算に含めます。給水20m・給湯15m・排水15m・換気10m/戸、空調1台・空調配管5m/居室、照明とスイッチは居室数＋4、コンセントは居室数×3＋5、電気配線は住戸面積×2m、給湯器・分電盤は各1/戸です。実施設計の数量ではありません。</p>
  <p>間仕切り高さ2,400 mm・開口高さ2,100 mmを初期仮定とします。寸法未確定の什器は標準案、窓は1,800×1,200mmの仮仕様で概算します。階段仕上げは未計上です。外壁タイルは既存単価表を参照します。</p>
  <p>直接仮設・共通仮設・現場管理費・一般管理費は対象外。浴室内部の仕上げ・浴室扉はUBに含め、共有間仕切りは1回だけ計上します。</p>
  <label>部材種別 <select aria-label="仕様の部材種別" value={part} onChange={e=>{setPart(e.target.value);setPage(0)}}><option value="">すべて</option>{[...new Set(objects.map(o=>o.part))].map(p=><option key={p}>{p}</option>)}</select></label>{' '}
  <label>階 <select aria-label="仕様の階" value={floor} onChange={e=>{setFloor(e.target.value);setPage(0)}}><option value="">すべて</option>{[...new Set(objects.flatMap(o=>o.floor?[o.floor]:[]))].map(f=><option key={f} value={f}>{f}階</option>)}</select></label>{' '}
  <button type="button" onClick={()=>useSpecSelections.setState({selections:standardSelections(shown,selections,2400,2100,true)})}>絞り込み全件の未選択に標準案を適用</button>
  {!!stale.length&&<p role="status">平面からなくなった部材の仕様は計上していません。<button onClick={()=>stale.forEach(id=>set(id,null))}>不要な関連付けを削除</button></p>}
  <RecordPagination label="部材" {...visible} onPage={setPage}/>
  {!objects.length&&<p>保存済みの各階平面、または配置した什器が必要です。</p>}
  <div style={{maxHeight:380,overflow:'auto'}}><table className="spec-package-table" style={{width:'100%',fontSize:12}}><thead><tr><th>平面の部材</th><th>選択仕様</th><th>数量</th><th>単価区分・出典</th><th>金額</th></tr></thead><tbody>
  {visible.items.map(o=>{const s=selections[o.id];let line;let error='';try{line=s?packageLine(o,s.packageId,s):undefined}catch(e){error=String(e)}return <tr key={o.id} style={{background:active===o.id?'#e6f2ee':undefined}}>
    <td><button type="button" onClick={()=>setActive(o.id)}>{o.name??o.id}</button></td>
    <td><select aria-label={`${o.name??o.id}の仕様`} value={s?.packageId??''} onChange={e=>{choose(o,e.target.value);setActive(o.id)}}><option value="">未選択</option>{packageOptions(o).filter(p=>p.unit===o.unit).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>{error&&<div role="alert">{error}</div>}</td>
    <td>{line?.quantity===null?'寸法・数量未入力':(line?.quantity??o.quantity)?.toLocaleString('ja-JP',{maximumFractionDigits:3})??'未確定'} {o.unit}</td>
    <td>{line?`${line.priceStatus}／${line.source}`:'未選択'}{line?.sourceUrl&&<a href={line.sourceUrl} target="_blank" rel="noreferrer"> 出典</a>}</td>
    <td>{line?.amount==null?'未計上':`${line.amount.toLocaleString()}円`}</td>
  </tr>})}</tbody></table></div>
  {object&&selection&&<div style={{borderTop:'1px solid #bbb',marginTop:12,paddingTop:12}}>
   <strong>{object.name}</strong><p>{packageOptions(object).find(p=>p.id===selection.packageId)?.spec}</p>
   <p>数量根拠：{object.basis}。仕様の寸法・性能が実際の部材に合うことを確認してください。</p>
   {object.lengthMm!==undefined&&<><label>壁高さmm <input aria-label="壁高さmm" type="number" min="1" value={selection.heightMm??''} onChange={e=>change({heightMm:e.target.value&&Number(e.target.value)>0?Number(e.target.value):undefined})}/></label>{(object.openingWidthMm??0)>0&&<label>開口高さmm <input aria-label="開口高さmm" type="number" min="0" value={selection.openingHeightMm??''} onChange={e=>change({openingHeightMm:e.target.value?Math.max(0,Number(e.target.value)):undefined})}/></label>}</>}
   <label>確認済み数量で上書き（{object.unit}）<input aria-label="確認済み数量" type="number" min="0" value={selection.quantity??''} onChange={e=>change({quantity:e.target.value?Math.max(0,Number(e.target.value)):undefined})}/></label>
   <p>空欄なら平面から再計算します。未入力の寸法は0にしません。</p>
   <PriceEditor key={`${object.id}/${selection.packageId}`} selection={selection} onSave={price=>change({price})}/>
   {selection.packageId==='PKG-012'&&<p><a href="https://www.yoshino-gypsum.com/system/S12" target="_blank" rel="noreferrer">S12の仕様出典（吉野石膏）</a>：価格の出典ではありません。</p>}
  </div>}
  <details><summary>公表値の参照先・未接続の工種</summary><p><a href="https://roumuhi.mlit.go.jp/" target="_blank" rel="noreferrer">国土交通省 労務費に関する基準</a>。公表値を採用する場合は、下の単価登録で仕様と施工範囲の一致を確認し、出典・適用日・地域を記録します。既定単価はすべて独自の仮値です。</p><p>基礎・地業・設備配管・外構線状部材は標準案を保持していますが、現在の平面に対応する部材・経路がない場合は数量を自動生成しません。外周ふかし壁、UB周囲の建築壁、巾木も別の配置・範囲指定が必要です。</p></details>
 </section>
}
function PriceEditor({selection,onSave}:{selection:SpecSelection;onSave:(price:SpecSelection['price'])=>void}) {
 const [value,setValue]=useState(selection.price?String(selection.price.value):'')
 const [draft,setDraft]=useState<NonNullable<SpecSelection['price']>>(selection.price??{value:0,status:'仮値',source:'',url:'',date:'',region:'',scope:''})
 const [error,setError]=useState('')
 return <details><summary>この部材の単価・出典を登録</summary><p>施工範囲全体の単価を登録します。材料だけ・労務だけの公表値は登録しないでください。</p>
 <label>税別単価 <input aria-label="仕様単価" type="number" min="0" value={value} onChange={e=>setValue(e.target.value)}/></label>
 <label>区分 <select aria-label="単価区分" value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as '公表値'|'仮値'})}><option>仮値</option><option>公表値</option></select></label>
 {(['source','url','date','region','scope'] as const).map((key,i)=><label key={key} style={{display:'block'}}>{['出典名','出典URL','適用日','地域','含む施工範囲'][i]} <input aria-label={['出典名','出典URL','適用日','地域','含む施工範囲'][i]} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}
 <button type="button" onClick={()=>{if(!value.trim()||!Number.isFinite(Number(value))||Number(value)<0||!draft.source.trim()||!draft.scope.trim()||(draft.status==='公表値'&&(!/^https:\/\//.test(draft.url)||!draft.date||!draft.region))){setError('金額・出典・施工範囲を入力してください。公表値はHTTPSの出典URL・適用日・地域も必要です。');return}setError('');onSave({...draft,value:Number(value)})}}>単価を適用</button>{' '}<button type="button" onClick={()=>{onSave(undefined);setValue('')}}>標準の仮値に戻す</button>{error&&<p role="alert">{error}</p>}
 </details>
}
