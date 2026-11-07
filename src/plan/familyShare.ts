type Floor={cells:readonly {id:string}[];unitTypeIdsByCell?:Record<string,string|null>}
type Type={id:string;ldk:number;bedrooms:number}
export function currentFamilyShare(current:{source:string;plans:Record<number,Floor>},confirmed:{source:string;plans:Record<number,Floor>}|null,source:string,types:readonly Type[]):number|null{
 for(const candidate of [current,confirmed])if(candidate?.source===source&&Object.values(candidate.plans).some(p=>p.cells.length))return familyShare(candidate.plans,types)
 return null
}
/** 現行の候補分類に合わせ、LDKあり・個室2室以上をファミリーとして比較する。 */
export function familyShare(plans:Record<number,Floor>,types:readonly Type[]):number{
 const family=new Set(types.filter(t=>t.ldk>0&&t.bedrooms>=2).map(t=>t.id))
 let total=0,count=0
 for(const p of Object.values(plans))for(const c of p.cells){total++;if(family.has(p.unitTypeIdsByCell?.[c.id]??''))count++}
 return total?count/total:0
}
export function familyShareIssue(plans:Record<number,Floor>,types:readonly Type[],minimum:number):string|null{
 if(!Number.isFinite(minimum)||minimum<0||minimum>1)throw new Error('ファミリー住戸の割合は0～1で指定してください')
 const actual=familyShare(plans,types)
 return actual+1e-10<minimum?`ファミリー住戸の割合が基準を下回ります（最低 ${(minimum*100).toFixed(1)}%、候補 ${(actual*100).toFixed(1)}%）`:null
}
