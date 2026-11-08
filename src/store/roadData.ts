import {create} from 'zustand'
import {z} from 'zod'
import {decodeLocalJson} from '../map/localData'
import type {RoadRecord} from '../prep/convert'
const point=z.tuple([z.number().finite(),z.number().finite()])
const shape=z.object({roads:z.array(z.object({w:z.number().int(),c:z.number().int(),s:z.number().int().default(7),g:z.union([z.array(point).min(2),z.array(z.array(point).min(2))])}))})
export const useRoadData=create<{roads:RoadRecord[]|null;loading:boolean;error:string|null}>(()=>({roads:null,loading:false,error:null}))
let pending:Promise<RoadRecord[]>|null=null
export function loadRoadData():Promise<RoadRecord[]> {
 const current=useRoadData.getState().roads
 if(current) return Promise.resolve(current)
 if(pending) return pending
 useRoadData.setState({loading:true,error:null})
 pending=(async()=>{
  try {
   const res=await fetch('/local-data/roads-koto.json')
   if(!res.ok) throw new Error(`道路データ HTTP ${res.status}`)
   const {roads}=shape.parse(await decodeLocalJson(new Uint8Array(await res.arrayBuffer())))
   useRoadData.setState({roads,loading:false,error:null})
   return roads
  }catch(e){useRoadData.setState({roads:null,loading:false,error:e instanceof Error?e.message:String(e)});throw e}
  finally{pending=null}
 })()
 return pending
}
