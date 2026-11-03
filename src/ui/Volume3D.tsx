// P2 の 3D 表示（D-04 P2、G42）。押し出しの立体を読み取り専用で出す。
// 3D で見ただけでは線は変わらない（D-04 共通部品「3D への切替」）。描く入力は平面（DrawingCanvas）。
// 座標: 平面の (x, y) mm → three の (x, 高さ, y) m。
import { useMemo, useRef, type ComponentRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Point } from '../geom/viewport'
import { buildVolumeMesh, type VolumeMesh } from '../volume/mesh'

const MM_TO_M = 1 / 1000

function toGeometry(mesh: VolumeMesh): THREE.BufferGeometry {
  const positions: number[] = []
  for (const tri of mesh.triangles) {
    for (const v of tri) positions.push(v.x * MM_TO_M, v.z * MM_TO_M, v.y * MM_TO_M)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

function groundSize(footprint: readonly Point[]): { width: number; depth: number; cx: number; cz: number } {
  const xs = footprint.map((p) => p.x)
  const ys = footprint.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const margin = 5_000
  return {
    width: (maxX - minX + 2 * margin) * MM_TO_M,
    depth: (maxY - minY + 2 * margin) * MM_TO_M,
    cx: ((minX + maxX) / 2) * MM_TO_M,
    cz: ((minY + maxY) / 2) * MM_TO_M,
  }
}

interface Volume3DProps {
  footprint: Point[]
  storeyCount: number
  storeyHeightMm: number
  /** ホーム（既定の向きに戻す）を押した回数。変わると視点を戻す。 */
  homeToken: number
}

export function Volume3D({ footprint, storeyCount, storeyHeightMm, homeToken }: Volume3DProps) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  const geometry = useMemo(
    () => toGeometry(buildVolumeMesh({ footprint, storey_count: storeyCount, storey_height: storeyHeightMm })),
    [footprint, storeyCount, storeyHeightMm],
  )
  const ground = useMemo(() => groundSize(footprint), [footprint])

  // ホームの押下で視点を既定に戻す（homeToken が変わったときだけ）
  const lastHome = useRef(homeToken)
  if (lastHome.current !== homeToken) {
    lastHome.current = homeToken
    controlsRef.current?.reset()
  }

  return (
    <Canvas camera={{ position: [40, 40, 50], fov: 40 }}>
      <color attach="background" args={['#f4f4f2']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[30, 50, 20]} intensity={0.8} />
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#c9d3dc" side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ground.cx, 0, ground.cz]}>
        <planeGeometry args={[ground.width, ground.depth]} />
        <meshStandardMaterial color="#e6e3dc" />
      </mesh>
      <gridHelper args={[Math.max(ground.width, ground.depth), 20]} position={[ground.cx, 0.001, ground.cz]} />
      <OrbitControls ref={controlsRef} makeDefault />
    </Canvas>
  )
}
