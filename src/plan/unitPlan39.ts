import {normalizeWetAccess} from './wetAccess'
import {clearEntry} from './entryClearance'
import { z } from 'zod'
import type { Rect } from './candidateCells'
import type { Room } from './rooms'
const n=z.number().finite(), positive=n.positive()
const box=z.object({x:n,y:n,w:positive,h:positive})
export const unitPlanSchema=z.object({frameAligned:z.boolean().optional(),id:z.string(),type:z.string(),envelope:z.object({W:positive,D:positive,balcony_depth:n}),rooms:z.array(box.extend({id:z.string(),name:z.string(),kind:z.string(),code:z.string().optional(),area_m2:n})),doors:z.array(z.object({id:z.string(),kind:z.string(),width:positive,swing_into:z.string().nullable().optional(),between:z.array(z.string()).optional(),position:z.object({orientation:z.enum(['h','v']),coord:n,start:n})})),windows:z.array(z.object({id:z.string(),room_id:z.string(),side:z.enum(['N','E','S','W'])})),fixtures:z.array(box.extend({id:z.string(),kind:z.string()})),columns:z.array(z.object({id:z.string(),x:n,y:n}))})
export type UnitPlan39=z.infer<typeof unitPlanSchema>
const sources=import.meta.glob('./unitPlans/*.json',{eager:true,import:'default'})
export function readUnitPlan(typeId:string,variant='A'):UnitPlan39|null {
 const name=typeId.replace(/^T-08-/,'')
 if(name==='4LDK-2')return null
 const id=`${name==='4LDK-1'?'4LDK':name}-${variant}`
 const raw=sources[`./unitPlans/${id}.json`]
 if(!raw)return null
 const result=unitPlanSchema.safeParse(raw)
 if(!result.success)throw new Error('読めない案')
 return normalizeWetAccess(result.data)
}
export function placeUnitPlan(typeId:string,variant:string,cell:Rect,corridor:Omit<Rect,'id'>,override?:UnitPlan39) {
 let plan:UnitPlan39|null
 try{plan=override??readUnitPlan(typeId,variant)}catch{return {status:'読めない案',rooms:[] as Room[],plan:null,transform:''}}
 if(!plan)return {status:'仮の部屋割り',rooms:[] as Room[],plan:null,transform:''}
 if(!override)plan=clearEntry(plan)
 const left=cell.x1<=corridor.x0+1,right=cell.x0>=corridor.x1-1
 const vertical=left||right
 if(Math.abs((vertical?cell.y1-cell.y0:cell.x1-cell.x0)-plan.envelope.W)>1 || Math.abs((vertical?cell.x1-cell.x0:cell.y1-cell.y0)-plan.envelope.D)>1)return {status:'寸法が合わない',rooms:[] as Room[],plan,transform:''}
 const below=cell.y0>=corridor.y1-1
 const point=(x:number,y:number)=>left?{x:cell.x1-y,y:cell.y0+x}:right?{x:cell.x0+y,y:cell.y1-x}:below?{x:cell.x0+x,y:cell.y0+y}:{x:cell.x1-x,y:cell.y1-y}
 const transform=left?`matrix(0 1 -1 0 ${cell.x1} ${cell.y0})`:right?`matrix(0 -1 1 0 ${cell.x0} ${cell.y1})`:below?`translate(${cell.x0} ${cell.y0})`:`matrix(-1 0 0 -1 ${cell.x1} ${cell.y1})`
 const rooms:Room[]=plan.rooms.map(r=>{const a=point(r.x,r.y),b=point(r.x+r.w,r.y+r.h);return {id:`${cell.id}-${r.id}`,kind:r.name.includes('LDK')?'LDK':r.kind==='居室'?'洋室':'水回り',name:r.name,x0:Math.min(a.x,b.x),x1:Math.max(a.x,b.x),y0:Math.min(a.y,b.y),y1:Math.max(a.y,b.y)}})
 const shafts=plan.fixtures.filter(f=>f.kind==='PS').map(f=>{const a=point(f.x,f.y),b=point(f.x+f.w,f.y+f.h);return {id:`PS-${cell.id}-${f.id}`,kind:'PS' as const,unitId:cell.id,x0:Math.min(a.x,b.x),x1:Math.max(a.x,b.x),y0:Math.min(a.y,b.y),y1:Math.max(a.y,b.y)}})
 const door=plan.doors.find(d=>d.kind==='玄関ドア'&&d.position.orientation==='h'&&Math.abs(d.position.coord)<1&&d.position.start>=0&&d.position.start+d.width<=plan.envelope.W)
 const touches=left?Math.abs(cell.x1-corridor.x0)<1:right?Math.abs(cell.x0-corridor.x1)<1:below?Math.abs(cell.y0-corridor.y1)<1:Math.abs(cell.y1-corridor.y0)<1
 const ends=door?[point(door.position.start,0),point(door.position.start+door.width,0)]:[]
 const entrance=door&&touches&&ends.every(p=>p.x>=corridor.x0-1&&p.x<=corridor.x1+1&&p.y>=corridor.y0-1&&p.y<=corridor.y1+1)?point(door.position.start+door.width/2,0):undefined
 return {status:'ok',rooms,plan,transform,shafts,entrance,columns:plan.columns.map(c=>({...point(c.x,c.y),id:c.id})),entrySweep:door?[point(door.position.start,0),point(door.position.start+door.width,0),point(door.position.start+door.width,(door.swing_into==='共用廊下'?-door.width:door.width)),point(door.position.start,(door.swing_into==='共用廊下'?-door.width:door.width))]:undefined}
}

