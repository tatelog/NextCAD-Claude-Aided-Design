import type {EstimateDetail} from './estimateDetails'
import type {DetailLine} from './estimateDetail'
import type {PackageLine,SpecObject} from './specPackages'

export function packageDetails(lines:PackageLine[]):EstimateDetail[]{
 return lines.flatMap(l=>l.quantity===null?[]:[{lineId:`package/${l.objectId}`,objectId:l.objectId,category:l.category,item:l.name,quantity:l.quantity,unit:l.unit,unitPriceRef:`package/${l.packageId}/${l.version}`,provisional:l.priceStatus!=='公表値',basis:l.basis,source:`${l.priceStatus}／${l.source}${l.sourceUrl?' '+l.sourceUrl:''}`,amountYen:l.amount,origin:'自動',specification:l}])
}
/** 同じ施工範囲の旧集計は計上しない。未選択の部材は未計上として残す。 */
export function remainingLegacyDetails(details:DetailLine[],objects:SpecObject[],lines:PackageLine[]):DetailLine[]{
 const replaced=new Set(objects.filter(o=>lines.some(l=>l.objectId===o.id)).map(o=>o.legacyLineId))
 const roomPackages=objects.some(o=>o.part==='床')
 return details.filter(d=>!(roomPackages&&d.category==='内装'&&!d.item.includes('階段')&&!d.lineId.startsWith('fixture-count/'))&&!replaced.has(d.lineId))
}
