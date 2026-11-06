import {useMemo,useState} from 'react'
import {masterOf} from '../plan/unitTypeMaster'
import candidates from '../plan/unitTypeCandidates.json'
const UNIT_TYPES = masterOf(candidates)
import {rectangularStudy,type StudyType} from '../plan/rectangularStudy'
import {gravityStudy} from '../plan/gravityStudy'
export function RectangularStudyPanel({storeys,storeyHeightMm,initialWidth,initialLength,onClose}:{storeys:number;storeyHeightMm:number;initialWidth:number;initialLength:number;onClose:()=>void}) {
 const [width,setWidth]=useState(initialWidth),[length,setLength]=useState(initialLength),[corridor,setCorridor]=useState(2000),[column,setColumn]=useState(600),[floor,setFloor]=useState(1)
 const [types,setTypes]=useState<StudyType[]>(()=>UNIT_TYPES.map(t=>({id:t.id,frontageMm:t.frontage_mm??6000,depthMm:t.depth_mm??7000,psMm:600,wetEnd:'start'})))
 const [sequence,setSequence]=useState(['T-08-1LDK','T-08-2LDK'])
 const [dead,setDead]=useState(6),[live,setLive]=useState(2),[fc,setFc]=useState(30)
 const [zoom,setZoom]=useState(1)
 const result=useMemo(()=>{try{return {data:rectangularStudy({widthMm:width,lengthMm:length,corridorMm:corridor,storeys,storeyHeightMm,columnMm:column,types:sequence.map(id=>types.find(t=>t.id===id)!).filter(Boolean)}),error:null}}catch(e){return {data:null,error:(e as Error).message}}},[width,length,corridor,storeys,storeyHeightMm,column,sequence,types])
 const study=result.data,plan=study?.plan
 const maxArea=study?Math.max(...study.columns.map(c=>c.tributaryM2)):0
 const gravity=useMemo(()=>{try{return gravityStudy({tributaryM2:maxArea,floorsAbove:storeys-floor+1,deadKNM2:dead,liveKNM2:live,columnMm:column,fcMPa:fc,beamSpanM:Math.max(...types.filter(t=>sequence.includes(t.id)).map(t=>t.frontageMm))/1000,beamTributaryM:width/2000})}catch{return null}},[maxArea,storeys,floor,dead,live,column,fc,types,sequence,width])
 const update=(id:string,patch:Partial<StudyType>)=>setTypes(ts=>ts.map(t=>t.id===id?{...t,...patch}:t))
 const field=(label:string,v:number,set:(v:number)=>void)=><label style={{display:'block',marginBottom:6}}>{label}<input type="number" value={v} onChange={e=>set(Number(e.target.value))} style={{width:100,marginLeft:8}}/></label>
 const name=(id:string)=>UNIT_TYPES.find(t=>t.id===id)?.name??id
 return <div role="dialog" aria-modal="true" aria-label="長方形比較案" style={{position:'fixed',inset:24,zIndex:50,background:'#fff',boxShadow:'0 8px 40px #0005',display:'flex',flexDirection:'column',padding:12}}>
 <header style={{display:'flex',justifyContent:'space-between'}}><strong>長方形比較案 — 元のボリュームは変更しません</strong><button disabled={!study} onClick={() => {
 const blob=new Blob([JSON.stringify({kind:'rectangular-study',inputs:{width,length,corridor,column,storeys,storeyHeightMm,types,sequence,dead,live,fc},result:study},null,2)],{type:'application/json'})
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='長方形比較案.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}}>比較案JSONを保存</button><button onClick={onClose}>閉じる</button></header>
 <div style={{display:'grid',gridTemplateColumns:'260px minmax(0,1fr) 300px',flex:1,minHeight:0,gap:12,marginTop:12}}>
 <aside style={{overflow:'auto'}}>
 {field('短辺 mm',width,setWidth)}{field('長辺 mm',length,setLength)}{field('廊下幅 mm',corridor,setCorridor)}{field('柱角 mm',column,setColumn)}
 <p>{storeys}階・階高{storeyHeightMm}mm（ボリュームから）</p>
 <label>表示階<select value={floor} onChange={e=>setFloor(Number(e.target.value))}>{Array.from({length:storeys},(_,k)=><option key={k} value={k+1}>{k+1}階</option>)}</select></label>
 <p>各階は同一配置・同一柱軸・直通シャフト。斜線による階別縮小はこの比較案には適用していません。</p>
 <h3>住戸の並び</h3>{sequence.map((id,k)=><select key={k} value={id} onChange={e=>setSequence(v=>v.map((x,j)=>j===k?e.target.value:x))}>{types.map(t=><option key={t.id} value={t.id}>{name(t.id)}</option>)}</select>)}
 <button onClick={()=>setSequence(v=>[...v,types[0]!.id])}>列追加</button><button disabled={sequence.length<2} onClick={()=>setSequence(v=>v.slice(0,-1))}>末尾削除</button>
 <details open><summary>タイプ寸法・PS位置（編集可）</summary><p>初期値は仮置き。水回り側は長手方向の始端／終端です。</p>{types.map(t=><fieldset key={t.id}><legend>{name(t.id)}</legend>{field('間口 mm',t.frontageMm,v=>update(t.id,{frontageMm:v}))}{field('奥行 mm',t.depthMm,v=>update(t.id,{depthMm:v}))}{field('PS角 mm',t.psMm,v=>update(t.id,{psMm:v}))}<select value={t.wetEnd} onChange={e=>update(t.id,{wetEnd:e.target.value as 'start'|'end'})}><option value="start">水回り：始端側</option><option value="end">水回り：終端側</option></select></fieldset>)}</details>
 </aside>
 <main style={{overflow:'auto',background:'#f3f4f5'}}><div><button onClick={()=>setZoom(z=>Math.max(.25,z/1.25))}>−</button><button onClick={()=>setZoom(z=>Math.min(4,z*1.25))}>＋</button><button onClick={()=>setZoom(1)}>全体</button></div>
 {result.error?<p role="alert">{result.error}</p>:plan&&study&&<svg viewBox={`-1000 -1000 ${width+2000} ${length+2000}`} style={{display:'block',height:`${zoom*90}%`,minHeight:400,margin:'auto'}}>
 <rect width={width} height={length} fill="white" stroke="#243953" strokeWidth={50}/>
 <rect x={plan.corridor.x0} y={plan.corridor.y0} width={corridor} height={length} fill="#e5e7eb"/>
 {plan.cores.map(c=><g key={c.id}><rect x={c.x0} y={c.y0} width={c.x1-c.x0} height={c.y1-c.y0} fill="#b5c6cf" stroke="#567" strokeWidth={30}/><text x={(c.x0+c.x1)/2} y={(c.y0+c.y1)/2} fontSize={350} textAnchor="middle">{c.id==='evHall'?'EV・設備':c.id==='stairA'?'階段A':'階段B'}</text></g>)}
 {plan.cells.map(c=><g key={c.id}><rect x={c.x0} y={c.y0} width={c.x1-c.x0} height={c.y1-c.y0} fill="#f6f1df" stroke="#a69778" strokeWidth={25}/><text x={(c.x0+c.x1)/2} y={(c.y0+c.y1)/2} fontSize={350} textAnchor="middle">{name(study.unitTypes[c.id]!)}</text></g>)}
 {plan.shaftRects.map(s=><rect key={s.id} x={s.x0} y={s.y0} width={s.x1-s.x0} height={s.y1-s.y0} fill={s.kind==='PS'?'#ddaa45':'#9480b5'}><title>{s.id}</title></rect>)}
 {study.columns.map(c=><rect key={c.id} x={Math.min(width-column,Math.max(0,c.x-column/2))} y={Math.min(length-column,Math.max(0,c.y-column/2))} width={column} height={column} fill="#4e5a66"><title>{c.id} 負担面積{c.tributaryM2.toFixed(2)}㎡</title></rect>)}
 </svg>}
 </main>
 <aside style={{overflow:'auto'}}><h3>配置結果</h3>{plan&&<><p>{floor}階：{plan.unitsPerFloor}戸／全階 {plan.unitsPerFloor*storeys}戸</p><p>PS {plan.shafts.ps}・EPS 1・DS 1／階</p><p>柱候補 {study!.columns.length} 本／階</p><p>上下階：同一座標で連続</p></>}
 <h3>鉛直荷重の概算</h3>{field('固定 kN/㎡',dead,setDead)}{field('積載 kN/㎡',live,setLive)}{field('Fc MPa',fc,setFc)}
 <p>初期値は比較用の仮置き。固定荷重は部材自重等を含む入力値として扱います。</p>
 {gravity&&<dl><dt>最大負担面積</dt><dd>{maxArea.toFixed(2)}㎡</dd><dt>当該階柱の軸力概算</dt><dd>{gravity.axialKN.toFixed(1)} kN</dd><dt>平均軸応力度 N/A</dt><dd>{gravity.averageMPa.toFixed(2)} MPa</dd><dt>N/(A・Fc)</dt><dd>{gravity.axialRatio.toFixed(3)}</dd><dt>単純梁の参考曲げ</dt><dd>{gravity.beamMomentKNM.toFixed(1)} kN·m</dd><dt>単純梁の参考せん断</dt><dd>{gravity.beamShearKN.toFixed(1)} kN</dd></dl>}
 <p>柱：q×負担面積×上階数。梁：等分布荷重・単純支持のwL²/8、wL/2。梁の支配スパンは選択タイプの最大間口、負担幅は短辺の半分。</p>
 <p>断面耐力・配筋・地震時応力・基礎は未計算。構造安全の判定ではありません。</p>
 <details><summary>適用条件・未検討事項</summary>{study?.notices.map(n=><p key={n}>{n}</p>)}<a href="https://arxiv.org/abs/1910.00081" target="_blank" rel="noreferrer">配置関係と寸法を分離する研究</a><p>本実装は独立した規則配置で、論文の最適化手法そのものではありません。</p></details>
 </aside></div></div>
}
