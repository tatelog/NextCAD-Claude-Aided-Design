// P1 の周辺建物を 3D で見る（D-04 P1。仮置き）。基準点（P1 の地点）を原点にして、周辺建物を置く。
// 敷地の外形は P1 では持たない（筆界が未取得）ので、見せるのは周辺建物だけ。形の変換は P2 の Volume3D と同じ（toGeometry）。
import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { buildVolumeMesh } from '../volume/mesh'
import type { NeighborVolume } from '../volume/neighborLocal'
import { toGeometry } from './Volume3D'

/** 地面の一辺（mm）。周辺建物は基準点から半径 400 m 以内だけなので、その直径より少し広く取る */
const GROUND_MM = 1_000_000

export function NeighborScene3D({ neighbors }: { neighbors: readonly NeighborVolume[] }) {
  const geometry = useMemo(() => {
    const triangles = neighbors.flatMap((n) => buildVolumeMesh({ footprint: n.footprint, storey_count: 1, storey_height: n.heightMm }).triangles)
    return toGeometry({ triangles })
  }, [neighbors])
  return (
    <Canvas camera={{ position: [60, 60, 60], fov: 40 }} style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[30, 50, 20]} intensity={0.8} />
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#d8d4c8" side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[GROUND_MM / 1000, GROUND_MM / 1000]} />
        <meshStandardMaterial color="#e6e3dc" />
      </mesh>
      <OrbitControls makeDefault />
    </Canvas>
  )
}
