import {expect,it} from 'vitest'
import {placeUnitPlan,readUnitPlan} from './unitPlan39'
it('左右の住戸で玄関ドア中央を配置座標へ変換する',()=>{
 const p=readUnitPlan('2LDK','A')!,d=p.doors.find(d=>d.kind==='玄関ドア')!
 const w=p.envelope.W,h=p.envelope.D,x=d.position.start+d.width/2
 const corridor={x0:h,y0:0,x1:h+1600,y1:w}
 const left=placeUnitPlan('2LDK','A',{id:'L',x0:0,y0:0,x1:h,y1:w},corridor)
 const right=placeUnitPlan('2LDK','A',{id:'R',x0:h+1600,y0:0,x1:2*h+1600,y1:w},corridor)
 expect(left.entrance).toEqual({x:h,y:x})
 expect(right.entrance).toEqual({x:h+1600,y:w-x})
})

it('玄関が共用廊下から離れている場合は接続を返さない',()=>{
 const p=readUnitPlan('2LDK','A')!,w=p.envelope.W,h=p.envelope.D
 expect(placeUnitPlan('2LDK','A',{id:'L',x0:0,y0:0,x1:h,y1:w},{x0:h+1000,y0:0,x1:h+2600,y1:w}).entrance).toBeUndefined()
})
it('ドアの幅全体が住戸外形に収まらない場合は接続を返さない',()=>{
 const p=structuredClone(readUnitPlan('2LDK','A')!),w=p.envelope.W,h=p.envelope.D
 p.doors.find(d=>d.kind==='玄関ドア')!.position.start=w-100
 expect(placeUnitPlan('2LDK','A',{id:'L',x0:0,y0:0,x1:h,y1:w},{x0:h,y0:0,x1:h+1600,y1:w},p).entrance).toBeUndefined()
})
