export function patternConfiguration(ids:readonly string[]){
 if(!ids.length)throw new Error('住戸構成を選択してください')
 return {allowedTypeIds:[...new Set(ids)],minimumUnitsPerFloor:{},minimumFamilyRatio:undefined}
}
