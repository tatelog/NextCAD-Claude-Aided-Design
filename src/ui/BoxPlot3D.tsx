import { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { Point } from '../geom/viewport'

/** 地面へのレイ交点で対角二点を指定。カメラは維持する。 */
export function BoxPlot3D({ heightMm, onComplete, onCancel }: { heightMm: number; onComplete: (a: Point,b: Point)=>void; onCancel: ()=>void }) {
 const { gl, camera } = useThree()
 const [a,setA]=useState<Point|null>(null), [b,setB]=useState<Point|null>(null)
 const [field,setField]=useState<0|1|null>(null)
 const [size,setSize]=useState(['',''])
 const inputs=useRef<Array<HTMLInputElement|null>>([])
 const callbacks=useRef({onComplete,onCancel});callbacks.current={onComplete,onCancel}
 const valid=size.every(v=>Number.isFinite(Number(v))&&Number(v)>=1)
 const end=a&&b&&field!==null&&valid?{x:a.x+(b.x<a.x?-1:1)*Number(size[0]),y:a.y+(b.y<a.y?-1:1)*Number(size[1])}:b
 useEffect(()=>{if(field!==null){inputs.current[field]?.focus();inputs.current[field]?.select()}},[field])
 useEffect(()=>{
  const canvas=gl.domElement
  const point=(e:PointerEvent)=>{const r=canvas.getBoundingClientRect();const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());return hit?{x:Math.round(hit.x*1000),y:Math.round(-hit.z*1000)}:null}
  const down=(e:PointerEvent)=>{if(e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();if(field!==null)return;const p=point(e);if(!p)return;if(!a){setA(p);setB(p)}else if(Math.abs(p.x-a.x)>=1&&Math.abs(p.y-a.y)>=1)callbacks.current.onComplete(a,p)}
  const move=(e:PointerEvent)=>{if(a&&field===null){const p=point(e);if(p)setB(p)}}
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();callbacks.current.onCancel()}if(e.key==='Tab'&&a&&b){e.preventDefault();if(field===null)setSize([String(Math.abs(b.x-a.x)),String(Math.abs(b.y-a.y))]);setField(field===0?1:field===1?0:e.shiftKey?1:0)}}
  canvas.addEventListener('pointerdown',down,true);canvas.addEventListener('pointermove',move);window.addEventListener('keydown',key)
  return()=>{canvas.removeEventListener('pointerdown',down,true);canvas.removeEventListener('pointermove',move);window.removeEventListener('keydown',key)}
 },[a,b,field,gl,camera])
 if(!a||!end)return <Html center position={[0,0,0]}><span style={{pointerEvents:'none',whiteSpace:'nowrap'}}>地面の対角2点で作成</span></Html>
 return <group>
  <mesh position={[(a.x+end.x)/2000,heightMm/2000,-(a.y+end.y)/2000]}>
   <boxGeometry args={[Math.max(1,Math.abs(end.x-a.x))/1000,heightMm/1000,Math.max(1,Math.abs(end.y-a.y))/1000]}/>
   <meshBasicMaterial color="#438ac4" transparent opacity={0.35} depthWrite={false}/>
  </mesh>
  <Html position={[end.x/1000,heightMm/1000,-end.y/1000]}>
   {field===null?<span style={{whiteSpace:'nowrap',background:'#fff'}}> {Math.abs(end.x-a.x)} × {Math.abs(end.y-a.y)} mm · Tabで寸法入力</span>:<form style={{display:'flex',background:'#fff',padding:6,gap:4,whiteSpace:'nowrap'}} onSubmit={e=>{e.preventDefault();if(valid)callbacks.current.onComplete(a,end)}}>
    {['横','縦'].map((label,i)=><label key={label}>{label}<input ref={el=>{inputs.current[i]=el}} aria-label={`${label}寸法（mm）`} type="number" min="1" step="any" required style={{width:80}} value={size[i]} onFocus={()=>setField(i as 0|1)} onChange={e=>setSize(s=>s.map((v,j)=>i===j?e.target.value:v))}/></label>)} mm <button>確定</button>
   </form>}
  </Html>
 </group>
}
