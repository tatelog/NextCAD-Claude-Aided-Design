import type {AutoPlan} from '../plan/autoPlan'
import {entryChecks} from '../plan/entryChecks'
export function EntryCheckPanel({plan}:{plan:AutoPlan|null}){if(!plan)return null;const check=entryChecks(plan);return <details open><summary>玄関扉と共用廊下の干渉確認</summary><p>開閉範囲を覆う矩形で保守的に確認します。法定避難幅の適合判定ではありません。</p>{check.issues.length?<ul>{check.issues.map((issue,i)=><li key={i} style={{color:'#a33'}}>{issue}</li>)}</ul>:<p>開閉範囲の干渉候補なし</p>}</details>}
