import type {AutoPlan} from '../plan/autoPlan'
export function ElevatorMenu({plan,peopleText,residentsText,onPeople,onResidents,onApply,fixed=false,recommendation=null}:{plan:AutoPlan|null;peopleText:string;residentsText:string;onPeople:(value:string)=>void;onResidents:(value:string)=>void;onApply:()=>void;fixed?:boolean;recommendation?:number|null}){
 const result=plan?.circulation
 return <details aria-label="EV（エレベーター）の計画" style={{fontSize:12,margin:'8px 0',border:'1px solid #c2d4e5',borderRadius:6,padding:8}}>
  <summary style={{cursor:'pointer',fontWeight:600,fontSize:14}}>EV（エレベーター） · {result?`${result.evCount}台（概算）`:'未計算'}</summary>
  <div style={{marginTop:10}}>
   <label style={{display:'block',marginBottom:8}}>想定居住人数（全階）<input type="number" min="1" value={residentsText} onChange={e=>onResidents(e.target.value)} onBlur={onApply} placeholder={result?`自動：${result.residents}人`:'住戸数から自動計算'} style={{width:'100%'}}/></label>
   <label style={{display:'block',marginBottom:8}}>1戸あたりの想定人数<input type="number" min="0.1" step="0.1" value={peopleText} onChange={e=>onPeople(e.target.value)} onBlur={onApply} style={{width:'100%'}}/></label>
   <p>全階人数の空欄は配置戸数×1戸あたり人数で算出。直接入力時は各階の戸数比で配分し、1階を除いて輸送対象人数を求めます。</p>
   {result?<dl style={{margin:'8px 0'}}>
    <dt>全階の想定居住人数</dt><dd>{result.residents.toLocaleString('ja-JP')}人</dd>
    <dt>上階の輸送対象人数</dt><dd>{result.upperResidents.toLocaleString('ja-JP')}人</dd>
    <dt>5分間の輸送需要（対象人数×4%）</dt><dd>{(result.upperResidents*.04).toFixed(1)}人</dd>
    <dt>一周時間</dt><dd>{result.roundTripSeconds.toFixed(1)}秒</dd>
    <dt>配置台数／5分間の輸送能力</dt><dd>{result.evCount}台 ／ {result.capacityPerFiveMinutes.toFixed(1)}人</dd>
    <dt>平均運転間隔（一周時間÷台数）</dt><dd>{result.evCount?`${result.intervalSeconds.toFixed(1)}秒`:'対象外（上階なし）'}</dd>
    <dt>停止階・上下階の接続</dt><dd>{result.evCount&&plan?`1〜${plan.ev.storey_count}階・全階停止。同じ位置の昇降路を各階に確保。`:'EV配置なし'}</dd>
   </dl>:<p>未計算：平面の自動配置後に結果を表示します。</p>}
   <h4 style={{margin:'10px 0 4px'}}>台数の算定ロジック</h4>
   <ol style={{paddingLeft:20,margin:'4px 0'}}>
    <li>5分間の輸送需要＝上階の輸送対象人数×4%。</li>
    <li>一周時間＝往復走行時間＋停止時間＋始発階時間。</li>
    <li>輸送需要×一周時間÷（300秒×定員×乗車率）を切り上げ。</li>
    <li>平均運転間隔の目安（1台90秒・複数台60秒）を満たすまで増台。</li>
   </ol>
   {fixed?<p>配置はP2の確認値を固定しています。{recommendation!==null?`現在の人数による必要台数の概算：${recommendation}台。`:''}{recommendation!==null&&recommendation!==result?.evCount?'台数の変更はボリューム側で再計算・確認してください。':'人数の再計算では昇降路の位置を変更しません。'}</p>:<p>台数分の乗り場・昇降路を確保して住戸数と人数を再集計します。</p>}
   <details><summary>※ 計算条件・参考資料</summary>
    <p>計画仮定：9人乗り、乗車率80%、速度60m/分、停止10秒/階（上限8回）、始発階20秒。往復走行時間は（階数−1）×階高×2÷速度です。</p>
    <p><a href="https://www.mebs.co.jp/elevator/ssl/member/planning/traffic/" target="_blank" rel="noreferrer">住宅の人数・集中率の参考</a> ／ <a href="https://www.mebs.co.jp/elevator/ssl/member/planning/traffic/help_glossary.html" target="_blank" rel="noreferrer">輸送能力・運転間隔の参考</a></p>
    <p>初期計画の概算です。メーカーの交通計算・機種選定・バリアフリー適合は未確認。柱・梁の鉛直荷重計算とは別の計算です。</p>
   </details>
  </div>
 </details>
}
