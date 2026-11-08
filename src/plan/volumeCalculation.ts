import type {compareVolumePlans} from './volumePlan'
export type VolumeCalculationInput=Parameters<typeof compareVolumePlans>
export function startVolumeCalculation(input:VolumeCalculationInput,create=()=>new Worker(new URL('./volumeCalculation.worker.ts',import.meta.url),{type:'module'})){
 const worker=create();let settled=false,rejectJob:(e:Error)=>void=()=>{}
 const result=new Promise<ReturnType<typeof compareVolumePlans>>((resolve,reject)=>{
  rejectJob=reject
  worker.onmessage=e=>{if(settled)return;settled=true;worker.terminate();if(e.data.ok)resolve(e.data.result);else reject(new Error(e.data.error))}
  worker.onerror=()=>{if(settled)return;settled=true;worker.terminate();reject(new Error('配置計算に失敗しました。再計算してください'))}
  try{worker.postMessage(input)}catch(e){settled=true;worker.terminate();reject(e)}
 })
 return {result,cancel(){if(settled)return;settled=true;worker.terminate();rejectJob(new Error('計算を取り消しました'))}}
}
