import type {LayoutPreference} from '../plan/layoutPreference'
const distance=(m:number)=>Number.isFinite(m)?`${m.toLocaleString('ja-JP',{minimumFractionDigits:1,maximumFractionDigits:1})} m`:'未確認'
export function CirculationComparison({options}:{options:Array<{name:string;metrics:LayoutPreference}>}){
 return <details><summary>共用動線の比較</summary>
  <p style={{fontSize:11}}>玄関外からの経路です。室内は含みません。法定歩行距離の判定ではありません。</p>
  {options.map(({name,metrics})=><section key={name} aria-label={`${name}の共用動線`}>
   <strong>{name}</strong>
   <dl style={{display:'grid',gridTemplateColumns:'1fr auto',gap:'3px 8px',fontSize:12,margin:'6px 0 12px'}}>
    <dt>重複区間（最大）</dt><dd style={{margin:0}}>{distance(metrics.maxSharedRouteM)}</dd>
    <dt>最寄りの階段（最大）</dt><dd style={{margin:0}}>{distance(metrics.maxNearestStairM)}</dd>
    <dt>遠い方の階段（最大）</dt><dd style={{margin:0}}>{distance(metrics.maxSecondStairM)}</dd>
    <dt>EV（平均）</dt><dd style={{margin:0}}>{distance(metrics.meanElevatorM)}</dd>
   </dl>
  </section>)}
 </details>
}
