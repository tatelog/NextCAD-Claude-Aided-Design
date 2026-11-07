import {create} from 'zustand'
/** 平面ビューポートと共通ヘッダーで倍率を共有する。 */
export const usePlanZoom=create<{zoom:number;setZoom:(value:number|((previous:number)=>number))=>void}>(set=>({
 zoom:1,setZoom:value=>set(s=>({zoom:Math.max(0.25,Math.min(8,typeof value==='function'?value(s.zoom):value))}))
}))
