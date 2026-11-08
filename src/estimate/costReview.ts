import type {CheckIssue} from '../plan/nextCheck'
/** 計上済みの仮単価と金額未設定を分ける。明細の反復で合計欄を押し下げない。 */
export function costReview(lines:readonly {item:string;amountYen:number|null;provisional:boolean}[]):CheckIssue[]{
 const missing=new Map<string,number>();let provisional=0
 for(const line of lines){if(line.amountYen===null)missing.set(line.item,(missing.get(line.item)??0)+1);else if(line.provisional)provisional++}
 const entries=[...missing],issues:CheckIssue[]=[]
 if(entries.length)issues.push({area:'未計上',text:entries.slice(0,8).map(([name,count])=>`${name}（${count}件）`).join('、')+(entries.length>8?`ほか${entries.length-8}品目`:'')+'。数量・単価を右の内訳で確認してください。'})
 if(provisional)issues.push({area:'仮単価で計上済み',text:`${provisional}件。仮の金額は合計に含まれています。`})
 return issues
}
