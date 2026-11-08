/** 利用者承認の配置探索範囲。法定面積ではなく住戸区画面積。 */
const ranges:Record<string,{min:number;max:number}>={'1K':{min:20,max:30},'1DK':{min:25,max:40},'1LDK':{min:35,max:55},'2LDK':{min:50,max:70},'3LDK':{min:65,max:90},'4LDK':{min:80,max:110}}
export function unitAreaRange(type:string){return ranges[type.replace(/^T-08-/,'').replace(/-[12]$/,'')]}
export function unitAreaAllowed(type:string,areaMm2:number){const r=unitAreaRange(type);return Number.isFinite(areaMm2)&&areaMm2>0&&(!r||(areaMm2>=r.min*1e6-.01&&areaMm2<=r.max*1e6+.01))}
export function typesForArea(areaM2:number){return Object.keys(ranges).filter(t=>unitAreaAllowed(t,areaM2*1e6))}
export function unitAreaReason(type:string){const r=unitAreaRange(type);return r?`${type}: 住戸区画面積は ${r.min}〜${r.max}㎡の範囲が必要です`:''}
