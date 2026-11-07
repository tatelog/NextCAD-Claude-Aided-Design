import type {AutoPlan} from '../plan/autoPlan'
/** 共用部の模式図。階段・乗り場・昇降路を区別し、廊下への入口を示す。 */
export function CirculationLayer({plan}:{plan:AutoPlan}){
 const info=plan.circulation
 if(!info)return null
 const corridor=plan.corridor
 return <g aria-label="階段・EVの共用動線">
  {[...(plan.corridors??[corridor]),...(plan.bridges??[])].map(r=><rect aria-label="共用廊下" key={r.id} x={r.x0} y={r.y0} width={r.x1-r.x0} height={r.y1-r.y0} fill="#edf1f1" stroke="#76938a" strokeWidth={20}/>)}
  {plan.layout==='ツイン'&&<>
   {(plan.voids??[]).map(r=><g key={r.id}><rect x={r.x0} y={r.y0} width={r.x1-r.x0} height={r.y1-r.y0} fill="#f5faf1" stroke="#9baf8e" strokeWidth={30} strokeDasharray="180 100"/>{r.y1-r.y0>5000&&<text x={(r.x0+r.x1)/2} y={(r.y0+r.y1)/2} fontSize={400} textAnchor="middle" fill="#567148">吹抜け（床なし）</text>}</g>)}
  </>}
  {plan.cores.filter(c=>c.id!=='evHall').map((c,index)=>{const x=c.x1===corridor.x0?c.x1:c.x0,y=(c.y0+c.y1)/2;return <g key={c.id}>
   <rect aria-label={`階段室${index+1}`} x={c.x0} y={c.y0} width={c.x1-c.x0} height={c.y1-c.y0} fill="#edf3ee" stroke="#527967" strokeWidth={30}/>
   {Array.from({length:9},(_,i)=>c.x1-c.x0>c.y1-c.y0?<line key={i} x1={c.x0+1400+i*340} x2={c.x0+1400+i*340} y1={c.y0+180} y2={c.y1-180} stroke="#527967" strokeWidth={22}/>:<line key={i} x1={c.x0+180} x2={c.x1-180} y1={c.y0+1400+i*340} y2={c.y0+1400+i*340} stroke="#527967" strokeWidth={22}/>)}
   <line x1={x} x2={x} y1={y-500} y2={y+500} stroke="white" strokeWidth={65}/>
   <text x={(c.x0+c.x1)/2} y={c.y0+850} textAnchor="middle" fontSize={300} fill="#315f4a">階段{index+1}</text>
   <text x={(c.x0+c.x1)/2} y={c.y1-500} textAnchor="middle" fontSize={270} fill="#315f4a">↑ UP</text>
  </g>})}
  {info.liftShafts.length>0&&<>
   <rect x={info.lobby.x0} y={info.lobby.y0} width={info.lobby.x1-info.lobby.x0} height={info.lobby.y1-info.lobby.y0} fill="#edf5ff" stroke="#7693b3" strokeWidth={20}/>
   <text x={(info.lobby.x0+info.lobby.x1)/2} y={(info.lobby.y0+info.lobby.y1)/2} fontSize={260} textAnchor="middle" fill="#315a82">乗り場</text>
   {info.liftShafts.map((s,i)=>{const x=s.x0===info.lobby.x1?s.x0:s.x1,y=(s.y0+s.y1)/2;return <g key={s.id}><rect x={s.x0} y={s.y0} width={s.x1-s.x0} height={s.y1-s.y0} fill="#c4d8ee" stroke="#315a82" strokeWidth={25}/><text x={(s.x0+s.x1)/2} y={y+100} textAnchor="middle" fontSize={300} fill="#244768">EV {i+1}</text>{plan.layout==='ツイン'?<line x1={(s.x0+s.x1)/2-450} x2={(s.x0+s.x1)/2+450} y1={s.y1} y2={s.y1} stroke="white" strokeWidth={65}/>:<line x1={x} x2={x} y1={y-450} y2={y+450} stroke="white" strokeWidth={65}/>}</g>})}
   <line x1={info.lobby.x0===corridor.x1?info.lobby.x0:info.lobby.x1} x2={info.lobby.x0===corridor.x1?info.lobby.x0:info.lobby.x1} y1={info.lobby.y0+400} y2={info.lobby.y1-400} stroke="white" strokeWidth={65}/>
  </>}
  {(info.elevatorRoutes??[]).map((route,i)=><polyline key={`ev-${i}`} points={route.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#5784aa" strokeWidth={22} strokeDasharray="100 100"/>)}
  {info.routes.map((route,i)=><polyline key={i} points={route.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#438b77" strokeWidth={25} strokeDasharray="100 80"/>)}
 </g>
}
