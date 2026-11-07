import type { Dir } from './viewCube'

export function OrientationCompass({ angle, camera }: { angle: number; camera?: Dir }) {
  const a = angle * Math.PI / 180
  const b = camera ?? {x:0,y:1,z:0}
  const length = Math.hypot(b.x,b.y,b.z) || 1
  const bx=b.x/length, by=b.y/length, bz=b.z/length
  const flat=Math.hypot(bx,bz)
  const rx=flat>1e-9?bz/flat:1, rz=flat>1e-9?-bx/flat:0
  const ux=by*rz, uz=-by*rx
  const project=(x:number,y:number) => {
    const px=x*Math.cos(a)-y*Math.sin(a), pz=-(x*Math.sin(a)+y*Math.cos(a))
    return {x:46+30*(px*rx+pz*rz),y:46-30*(px*ux+pz*uz)}
  }
  return <svg width="92" height="92" viewBox="0 0 92 92" aria-label="方位（北・東・南・西）" style={{pointerEvents:'none'}}>
    {([['北',0,1],['東',1,0],['南',0,-1],['西',-1,0]] as const).map(([label,x,y]) => {
      const p=project(x,y)
      return <g key={label}><line x1="46" y1="46" x2={p.x} y2={p.y} stroke={label==='北'?'#9b4242':'#70757b'} /><text x={p.x} y={p.y} dy=".35em" textAnchor="middle" fontSize="12" fill={label==='北'?'#9b4242':'#303b49'} stroke="white" strokeWidth="3" paintOrder="stroke">{label}</text></g>
    })}
  </svg>
}
