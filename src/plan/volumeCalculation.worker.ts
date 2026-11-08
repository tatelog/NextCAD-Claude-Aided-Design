import {compareVolumePlans} from './volumePlan'
import type {VolumeCalculationInput} from './volumeCalculation'
self.onmessage=(event:MessageEvent<VolumeCalculationInput>)=>{
 try{self.postMessage({ok:true,result:compareVolumePlans(...event.data)})}
 catch(e){self.postMessage({ok:false,error:e instanceof Error?e.message:String(e)})}
}
