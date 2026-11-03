// P2 の 3D 表示（D-04 P2、G42）。押し出しの立体を読み取り専用で出す。
// 3D で見ただけでは線は変わらない（D-04 共通部品「3D への切替」）。描く入力は平面（DrawingCanvas）。
// 座標: 平面の (x, y) mm → three の (x, 高さ, y) m。
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Point } from '../geom/viewport'
import { buildVolumeMesh, type VolumeMesh } from '../volume/mesh'
import { triangulatePolygon } from '../geom/triangulate'
import { cameraForFace, type Face } from './viewFaces'

const FACE_LABELS: { face: Face; label: string }[] = [
  { face: 'top', label: '上' },
  { face: 'bottom', label: '下' },
  { face: 'front', label: '正面' },
  { face: 'back', label: '背面' },
  { face: 'left', label: '左' },
  { face: 'right', label: '右' },
]

type FaceRequest = { face: Face; token: number }

// ビューキューブで選ばれた面へ視点を向ける（Canvas の中で、カメラを直接動かす）。
function CameraDirector({ request }: { request: FaceRequest | null }) {
  const { camera } = useThree()
  const last = useRef<number | null>(null)
  useEffect(() => {
    if (!request || request.token === last.current) return
    last.current = request.token
    const p = cameraForFace(request.face, 60)
    camera.position.set(p.x, p.y, p.z)
    camera.lookAt(0, 0, 0)
  }, [request, camera])
  return null
}

const MM_TO_M = 1 / 1000

function toGeometry(mesh: Pick<VolumeMesh, 'triangles'>): THREE.BufferGeometry {
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

// 地面に落ちる影（平面の多角形）を、地面のすぐ上の薄い面にする（D-04 P2「地面に日影の影」、G54）
function shadowGeometry(shadows: readonly (readonly Point[])[]): THREE.BufferGeometry {
  const positions: number[] = []
  for (const shadow of shadows) {
    for (const [a, b, c] of triangulatePolygon(shadow)) {
      for (const v of [a, b, c]) positions.push(v.x * MM_TO_M, 0.002, v.y * MM_TO_M)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

interface Volume3DProps {
  footprint: Point[]
  /** 地面に落ちる影（任意）。太陽の位置から作る */
  shadow?: Point[][] | null
  /** 周辺建物（任意）。底面と高さ（mm）。敷地の立体とは別の色で置く */
  neighbors?: { footprint: Point[]; heightMm: number }[]
  storeyCount: number
  storeyHeightMm: number
  /** ホーム（既定の向きに戻す）を押した回数。変わると視点を戻す。 */
  homeToken: number
}

export function Volume3D({ footprint, shadow, neighbors, storeyCount, storeyHeightMm, homeToken }: Volume3DProps) {
  const shadowGeo = useMemo(() => (shadow && shadow.length > 0 ? shadowGeometry(shadow) : null), [shadow])
  // 周辺建物は 1 つの形にまとめて描く（建物ごとに部品を作ると描画の呼び出しが増えすぎる）
  const neighborGeo = useMemo(() => {
    if (!neighbors || neighbors.length === 0) return null
    const triangles = neighbors.flatMap((n) => buildVolumeMesh({ footprint: n.footprint, storey_count: 1, storey_height: n.heightMm }).triangles)
    return toGeometry({ triangles })
  }, [neighbors])
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  const geometry = useMemo(
    () => toGeometry(buildVolumeMesh({ footprint, storey_count: storeyCount, storey_height: storeyHeightMm })),
    [footprint, storeyCount, storeyHeightMm],
  )
  const ground = useMemo(() => groundSize(footprint), [footprint])

  const [faceRequest, setFaceRequest] = useState<FaceRequest | null>(null)

  // ホームの押下で視点を既定に戻す（homeToken が変わったときだけ）
  const lastHome = useRef(homeToken)
  if (lastHome.current !== homeToken) {
    lastHome.current = homeToken
    controlsRef.current?.reset()
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <Canvas camera={{ position: [40, 40, 50], fov: 40 }}>
      <CameraDirector request={faceRequest} />
      <color attach="background" args={['#f4f4f2']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[30, 50, 20]} intensity={0.8} />
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#c9d3dc" side={THREE.DoubleSide} />
      </mesh>
      {neighborGeo && (
        <mesh geometry={neighborGeo}>
          <meshStandardMaterial color="#d8d4c8" side={THREE.DoubleSide} />
        </mesh>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ground.cx, 0, ground.cz]}>
        <planeGeometry args={[ground.width, ground.depth]} />
        <meshStandardMaterial color="#e6e3dc" />
      </mesh>
      <gridHelper args={[Math.max(ground.width, ground.depth), 20]} position={[ground.cx, 0.001, ground.cz]} />
      {shadowGeo && (
        <mesh geometry={shadowGeo}>
          <meshBasicMaterial color="#3a4450" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      <OrbitControls ref={controlsRef} makeDefault />
    </Canvas>
    <div style={{ position: 'absolute', top: 8, right: 8, display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: 4 }}>
      {FACE_LABELS.map(({ face, label }) => (
        <button
          key={face}
          type="button"
          onClick={() => setFaceRequest((prev) => ({ face, token: (prev?.token ?? 0) + 1 }))}
          style={{ font: 'inherit', fontSize: 12, padding: '2px 6px', border: '1px solid #b8b2a4', borderRadius: 4, background: '#fff', cursor: 'pointer' }}
        >
          {label}
        </button>
      ))}
    </div>
    </div>
  )
}
