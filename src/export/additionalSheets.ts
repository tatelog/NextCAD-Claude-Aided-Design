import polygonClipping from 'polygon-clipping'
import type {AutoPlan} from '../plan/autoPlan'
import {GSI_BASEMAP_TILES} from '../map/basemap'
const sheet=(title:string,body:string)=>`<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 420 297"><rect width="420" height="297" fill="white"/><text x="12" y="14" font-size="5">${title}</text>${body}</svg>`
const area=(ring:number[][])=>Math.abs(ring.reduce((s,p,i)=>{const q=ring[(i+1)%ring.length]!;return s+p[0]!*q[1]!-q[0]!*p[1]!},0))/2
export function floorAreaGeometry(p:AutoPlan){
 const points=p.buildingOutline??[{x:0,y:0},{x:p.widthMm,y:0},{x:p.widthMm,y:p.depthMm},{x:0,y:p.depthMm}]
 if(points.length<3||points.some(v=>!Number.isFinite(v.x)||!Number.isFinite(v.y)))throw Error('床輪郭が不正です')
 const ring=points.map(v=>[v.x,v.y] as [number,number]);ring.push(ring[0]!)
 const cuts=(p.voids??[]).filter(v=>v.x1>v.x0&&v.y1>v.y0).map(v=>[[[v.x0,v.y0],[v.x1,v.y0],[v.x1,v.y1],[v.x0,v.y1],[v.x0,v.y0]]] as polygonClipping.Polygon)
 const result=cuts.length?polygonClipping.difference([ring],...cuts):[[ring]]
 const gross=area(ring)/1e6,net=result.reduce((n,poly)=>n+area(poly[0]!)-poly.slice(1).reduce((v,r)=>v+area(r),0),0)/1e6
 return {ring,result,gross,net,excluded:gross-net}
}
export function floorAreaSheet(p:AutoPlan,floor:number):string {
 const g=floorAreaGeometry(p),xs=g.ring.map(v=>v[0]),ys=g.ring.map(v=>v[1]),minX=Math.min(...xs),minY=Math.min(...ys),w=Math.max(...xs)-minX,h=Math.max(...ys)-minY
 if(!(w>0&&h>0))throw Error('床輪郭の寸法が不正です')
 const scale=Math.max(w/220,h/225),xy=(v:number[])=>`${20+(v[0]!-minX)/scale},${30+(v[1]!-minY)/scale}`
 const path=g.result.map(poly=>poly.map(r=>'M'+r.map(xy).join('L')+'Z').join('')).join('')
 const vertices=g.ring.slice(0,-1)
 const dimensions=g.result.flatMap(poly=>poly.flatMap(r=>r.slice(0,-1).map((v,i)=>{const q=r[i+1]!,length=Math.hypot(q[0]-v[0],q[1]-v[1])/1000;return `<text x="${20+((v[0]+q[0])/2-minX)/scale+1}" y="${30+((v[1]+q[1])/2-minY)/scale+3}" font-size="2.6">${length.toFixed(3)} m</text>`}))).join('')
 const body=`<path d="${path}" fill="#e3eef8" fill-rule="evenodd" stroke="#234" stroke-width="0.4"/>`+dimensions+vertices.map((v,i)=>`<text x="${20+(v[0]-minX)/scale}" y="${28+(v[1]-minY)/scale}" font-size="3">P${i+1}</text>`).join('')+
 `<text x="255" y="30" font-size="4">保存済み床輪郭の求積</text><text x="255" y="41" font-size="3.5">輪郭面積 A = ${g.gross.toFixed(3)} m2</text><text x="255" y="51" font-size="3.5">吹抜け控除 B = ${g.excluded.toFixed(3)} m2</text><text x="255" y="61" font-size="3.5">A − B = ${g.net.toFixed(3)} m2</text><text x="255" y="74" font-size="3">A = |Σ(x[i] y[i+1] − x[i+1] y[i])| / 2</text><text x="255" y="83" font-size="3">座標（m）・輪郭順／末尾はP1へ閉合</text>`+
 vertices.map((v,i)=>`<text x="${255+Math.floor(i/22)*78}" y="${93+(i%22)*7}" font-size="2.7">P${i+1} (${(v[0]/1000).toFixed(3)}, ${(v[1]/1000).toFixed(3)})</text>`).join('')+
 `<text x="12" y="272" font-size="3">縮尺 1:${scale.toFixed(2)} ／ 吹抜けは輪郭内の重複を除いて控除。バルコニーは含みません。</text><text x="12" y="281" font-size="3">保存輪郭による幾何面積です。法定床面積の算入・不算入の確定値ではありません。</text>`
 return sheet(`${floor}階 床面積求積図`,body)
}
export async function vicinitySheet(center:{lat:number;lon:number},signal?:AbortSignal):Promise<string>{
 if(!Number.isFinite(center.lat)||!Number.isFinite(center.lon)||Math.abs(center.lat)>85||Math.abs(center.lon)>180)throw Error('敷地位置が不正です')
 const z=16,n=2**z,x=(center.lon+180)/360*n,y=(1-Math.asinh(Math.tan(center.lat*Math.PI/180))/Math.PI)/2*n,tx=Math.floor(x),ty=Math.floor(y)
 const tiles=await Promise.all(Array.from({length:9},async(_,i)=>{const dx=i%3-1,dy=Math.floor(i/3)-1,url=GSI_BASEMAP_TILES[0]!.replace('{z}',String(z)).replace('{x}',String(tx+dx)).replace('{y}',String(ty+dy));const res=await fetch(url,{signal});if(!res.ok)throw Error('周辺地図を取得できませんでした');const bytes=new Uint8Array(await res.arrayBuffer());let binary='';for(let k=0;k<bytes.length;k+=8192)binary+=String.fromCharCode(...bytes.subarray(k,k+8192));return `<image x="${95+(dx+1)*76}" y="${25+(dy+1)*76}" width="76" height="76" href="data:image/png;base64,${btoa(binary)}"/>`}))
 const px=95+(x-tx+1)*76,py=25+(y-ty+1)*76,mPerPixel=156543.03392804097*Math.cos(center.lat*Math.PI/180)/n,bar=100/mPerPixel*76/256
 return sheet('付近見取図',tiles.join('')+`<circle cx="${px}" cy="${py}" r="3" fill="none" stroke="#c22" stroke-width="1"/><rect x="${px+4}" y="${py-5}" width="18" height="7" fill="white"/><text x="${px+5}" y="${py}" font-size="4" fill="#c22">計画地</text><path d="M350 60V30l-3 8m3-8 3 8" fill="none" stroke="#222"/><text x="347" y="26" font-size="4">N</text><path d="M20 250h${bar}" stroke="#222" stroke-width="1"/><text x="20" y="258" font-size="3">100 m</text><text x="12" y="274" font-size="3">中心 緯度 ${center.lat.toFixed(6)}・経度 ${center.lon.toFixed(6)} ／ 北が上・中心位置の縮尺 約1:${Math.round(mPerPixel*256/0.076)}</text><text x="12" y="283" font-size="3">出典：国土地理院 標準地図（地理院タイル） https://maps.gsi.go.jp/development/ichiran.html</text>`)
}
