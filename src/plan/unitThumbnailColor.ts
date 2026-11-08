import data from './unitTypeCandidates.json'
/** 同じ住戸タイプ・原案には、候補や配置位置によらず同じ色を使う。 */
export function unitThumbnailColor(typeId:string,planId=''){
 const index=data.types.findIndex(t=>t.id===typeId)
 if(index<0)return '#d7dce2'
 const variant=/-([ABC])$/.exec(planId)?.[1]??'A'
 const hue=((index*3+'ABC'.indexOf(variant))*137.508)%360
 return `hsl(${hue.toFixed(1)} 58% 78%)`
}
