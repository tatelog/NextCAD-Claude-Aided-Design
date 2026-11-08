import type {UnitPlan39} from './unitPlan39'
type Room=UnitPlan39['rooms'][number]
const wash=(r:Room)=>/脱衣/.test(r.name)
const bath=(r:Room)=>/浴室/.test(r.name)
const toilet=(r:Room)=>/WC|トイレ/.test(r.name)
function links(p:UnitPlan39,d:UnitPlan39['doors'][number]){
 const {orientation:o,coord:c,start:s}=d.position
 return p.rooms.filter(r=>o==='h'?(Math.abs(r.y-c)<1||Math.abs(r.y+r.h-c)<1)&&s>=r.x-1&&s+d.width<=r.x+r.w+1:(Math.abs(r.x-c)<1||Math.abs(r.x+r.w-c)<1)&&s>=r.y-1&&s+d.width<=r.y+r.h+1)
}
export function wetAccessIssues(p:UnitPlan39){
 if(p.rooms.length<2)return []
 const edges=p.doors.map(d=>links(p,d)),issues:{code:string;message:string;x:number;y:number}[]=[]
 for(const r of p.rooms.filter(bath))if(!edges.some(e=>e.includes(r)&&e.some(wash)))issues.push({code:'bath-access',message:'浴室は脱衣所から直接入る必要があります',x:r.x,y:r.y})
 const seen=new Set(p.rooms.filter(r=>/玄関/.test(r.name)).map(r=>r.id));let changed=true
 while(changed){changed=false;for(const e of edges){if(e.some(r=>seen.has(r.id)&&!toilet(r)))for(const r of e)if(!toilet(r)&&!seen.has(r.id)){seen.add(r.id);changed=true}}}
 if(seen.size)for(const r of p.rooms.filter(r=>!toilet(r)))if(!seen.has(r.id))issues.push({code:'toilet-through',message:`${r.name}: トイレを通らない経路が必要です`,x:r.x,y:r.y})
 return issues
}
/** 一列の水回りは寸法を保ったまま WC・脱衣・浴室に並べ替え、独立した入口を設ける。 */
export function normalizeWetAccess(source:UnitPlan39):UnitPlan39{
 const p=structuredClone(source),w=p.rooms.find(wash),t=p.rooms.find(toilet),b=p.rooms.find(bath)
 if(!w||!t||!b||!wetAccessIssues(p).length)return p
 const rs=[w,t,b].sort((a,b)=>a.y-b.y)
 if(!rs.every(r=>r.x===w.x&&r.w===w.w)||rs.slice(1).some((r,i)=>Math.abs(r.y-rs[i]!.y-rs[i]!.h)>1))return p
 const old=structuredClone(p),ids=new Set([w.id,t.id,b.id]);let y=rs[0]!.y
 for(const r of [t,w,b]){const before=old.rooms.find(v=>v.id===r.id)!;r.y=y;y+=r.h;for(const f of p.fixtures){const original=old.fixtures.find(v=>v.id===f.id)!;if(original.x>=before.x&&original.y>=before.y&&original.x+original.w<=before.x+before.w+1&&original.y+original.h<=before.y+before.h+1)f.y=original.y+r.y-before.y}}
  const entry=p.rooms.find(r=>/玄関/.test(r.name)&&r.x===t.x&&r.w===t.w&&Math.abs(r.y+r.h-t.y)<1)
 if(entry&&entry.h>=2400&&w.h<1800){const delta=Math.min(600,entry.h-1800);entry.h-=delta;entry.area_m2=entry.w*entry.h/1e6;for(const f of p.fixtures)if(f.x>=t.x&&f.x+f.w<=t.x+t.w+1&&f.y>=t.y&&f.y+f.h<=t.y+t.h+1)f.y-=delta;t.y-=delta;w.y-=delta;w.h+=delta;w.area_m2=w.w*w.h/1e6}
 p.doors=p.doors.filter(d=>!links(old,d).some(r=>ids.has(r.id)))
 function connect(a:Room,candidates:Room[],id:string){
  for(const c of candidates){for(const o of ['h','v'] as const){const horizontal=o==='h',a0=horizontal?a.y:a.x,a1=a0+(horizontal?a.h:a.w),c0=horizontal?c.y:c.x,c1=c0+(horizontal?c.h:c.w);const coord=Math.abs(a1-c0)<1?a1:Math.abs(c1-a0)<1?a0:undefined;if(coord===undefined)continue
   const start=Math.max(horizontal?a.x:a.y,horizontal?c.x:c.y),end=Math.min(horizontal?a.x+a.w:a.y+a.h,horizontal?c.x+c.w:c.y+c.h);if(end-start<700)continue
   p.doors.push({id,kind:'引戸',width:700,swing_into:null,between:[a.id,c.id],position:{orientation:o,coord,start:id==='WET-BATH'?start:start+(end-start-700)/2}});return
  }}
 }
 connect(b,[w],'WET-BATH');connect(t,p.rooms.filter(r=>!ids.has(r.id)&&/玄関|廊下/.test(r.name)).concat(p.rooms.filter(r=>!ids.has(r.id))),'WET-WC');connect(w,p.rooms.filter(r=>!ids.has(r.id)),'WET-WASH')
 return p
}



