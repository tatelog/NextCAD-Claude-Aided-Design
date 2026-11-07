import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

// 実際に表示する立体の水平断面を使い、斜線で後退した階にも追従する。
export function FloorLevels({ geometry, count, heightMm }: { geometry: THREE.BufferGeometry; count: number; heightMm: number }) {
  const levels = useMemo(() => {
    const pos = geometry.getAttribute('position')
    const result: { lines: THREE.BufferGeometry; label: THREE.CanvasTexture; at: [number,number,number] }[] = []
    for (let floor = 0; floor < count; floor++) {
      const y = floor * heightMm / 1000 + 0.002
      const points: THREE.Vector3[] = []
      for (let i = 0; i < pos.count; i += 3) {
        const vertices = [0,1,2].map(j => new THREE.Vector3().fromBufferAttribute(pos, i+j))
        const hits: THREE.Vector3[] = []
        for (let j = 0; j < 3; j++) {
          const a = vertices[j]!, b = vertices[(j+1)%3]!
          if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) hits.push(a.clone().lerp(b,(y-a.y)/(b.y-a.y)))
        }
        if (hits.length === 2) points.push(...hits)
      }
      if (!points.length) continue
      const edge = points.reduce((a,b) => b.x > a.x ? b : a)
      const canvas = document.createElement('canvas'); canvas.width=128; canvas.height=64
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle='rgba(255,255,255,0.88)'; ctx.fillRect(0,0,128,64)
      ctx.fillStyle='#465563'; ctx.font='32px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(`${floor+1}階`,64,32)
      result.push({ lines: new THREE.BufferGeometry().setFromPoints(points), label: new THREE.CanvasTexture(canvas), at: [edge.x+0.6,y+heightMm/2000,edge.z] })
    }
    return result
  }, [geometry,count,heightMm])
  useEffect(() => () => { for (const level of levels) { level.lines.dispose(); level.label.dispose() } }, [levels])
  return <group>{levels.map((level,i) => <group key={i}>
    <lineSegments geometry={level.lines} renderOrder={1}><lineBasicMaterial color="#536574" transparent opacity={0.7} depthWrite={false} depthFunc={THREE.LessEqualDepth} /></lineSegments>
    <sprite position={level.at} scale={[1.8,0.9,1]}><spriteMaterial map={level.label} depthTest={false} depthWrite={false} /></sprite>
  </group>)}</group>
}

