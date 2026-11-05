// P2 の 3D 表示（D-04 P2、G42）。押し出しの立体を読み取り専用で出す。
// 3D で見ただけでは線は変わらない（D-04 共通部品「3D への切替」）。描く入力は平面（DrawingCanvas）。
// 座標: 平面の (x, y) mm → three の (x, 高さ, y) m。
import { lotPlateTrianglesOf, LOT_LIFT_MM, sceneFrameOf, type SceneFrame } from './volumeScene'
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Point } from '../geom/viewport'
import { buildVolumeMesh, stackedMesh, type VolumeMesh } from '../volume/mesh'
import { triangulatePolygon } from '../geom/triangulate'
import { cameraForFace, type Face } from './viewFaces'
import { VolumeKnobs, type KnobPreview } from './VolumeKnobs'
import type { RotationStep } from '../volume/rotation'
import type { SetbackLine } from '../volume/setbackLines'
import { screenPointOf } from './setbackLabelScreen'

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

// 外形が無いとき、確定した敷地（と周辺建物）の範囲が画面に収まるように、カメラと目標を置く（統括の依頼 2026-11-06。B）
function FrameCamera({ frame, controlsRef }: { frame: SceneFrame | null; controlsRef: { current: ComponentRef<typeof OrbitControls> | null } }) {
  const { camera } = useThree()
  useEffect(() => {
    if (!frame) return
    camera.position.set(frame.position[0], frame.position[1], frame.position[2])
    camera.lookAt(frame.target[0], frame.target[1], frame.target[2])
    const controls = controlsRef.current
    if (controls) {
      controls.target.set(frame.target[0], frame.target[1], frame.target[2])
      controls.update()
    }
  }, [frame, camera, controlsRef])
  return null
}

const MM_TO_M = 1 / 1000

/** 三角形の一覧（mm）を three の形にする。P1 の周辺建物（NeighborScene3D）と同じ変換を使う */
export function toGeometry(mesh: Pick<VolumeMesh, 'triangles'>): THREE.BufferGeometry {
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

// 敷地からの離れの寸法線（G67）: 平面の mm を three の m に直し、地面の少し上に線を引く。両端と中点（表記を置く点）
function setbackEnds(line: SetbackLine) {
  const a: [number, number, number] = [line.from.x * MM_TO_M, 0.02, line.from.y * MM_TO_M]
  const b: [number, number, number] = [line.to.x * MM_TO_M, 0.02, line.to.y * MM_TO_M]
  const mid: [number, number, number] = [(a[0] + b[0]) / 2, 0.1, (a[2] + b[2]) / 2]
  return { a, b, mid }
}

function SetbackDimension({ line }: { line: SetbackLine }) {
  const { a, b } = setbackEnds(line)
  return <Line points={[a, b]} color="#1f5f8b" lineWidth={2} />
}

// 表記（m・小数 2 桁）は Canvas の外の DOM として React が持ち、中点の画面の位置へ毎フレーム写す。
// drei の Html は Canvas の外れるときに DOM を二重に外して removeChild が失敗するため使わない（統括の依頼 2026-11-05）
function SetbackLabels({ lines, labels }: { lines: SetbackLine[]; labels: Record<string, HTMLDivElement | null> }) {
  useFrame(({ camera, size }) => {
    for (const l of lines) {
      const el = labels[l.side]
      if (!el) continue
      const p = screenPointOf(setbackEnds(l).mid, camera as THREE.PerspectiveCamera, size)
      el.style.display = p ? '' : 'none'
      if (p) el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`
    }
  })
  return null
}

interface Volume3DProps {
  /** 外形（閉じているとき）。閉じていなければ null（敷地と周辺建物だけを見せる。統括の依頼 2026-11-06。4） */
  footprint: Point[] | null
  /** 確定した敷地の筆（平面）。外形の前から地面に出す */
  lot?: Point[] | null
  /** 地面に落ちる影（任意）。太陽の位置から作る */
  shadow?: Point[][] | null
  /** 周辺建物（任意）。底面と高さ（mm）。敷地の立体とは別の色で置く */
  neighbors?: { footprint: Point[]; heightMm: number }[]
  /** 段状に切った階（階ごとの床の形と天端の高さ mm）。あれば、階ごとに積んだ形を出す（D-04 P2）。無ければ外形を押し出す */
  floors?: { footprint: Point[]; heightMm: number }[]
  storeyCount: number
  storeyHeightMm: number
  /** ホーム（既定の向きに戻す）を押した回数。変わると視点を戻す。 */
  homeToken: number
  /** 3D の角の回転つまみ（G71）をつまんだとき（つまんだ時点の外形を覚えるため）。 */
  onRotateStart?: () => void
  /** 離したとき: 回す量（°、反時計回り。刻みで丸めた値）。渡さなければ回転のつまみは出さない。 */
  onRotate?: (deg: number) => void
  /** 回転のつまみの刻み（右パネルの刻み）。省略は自由。 */
  rotationStep?: RotationStep
  /** 3D の上面の高さのつまみ（G65）を離したとき: 新しい階数（1 以上・上限 30）。渡さなければ高さのつまみは出さない。 */
  onStoreyCount?: (n: number) => void
  /** 敷地からの離れの寸法線（G67）。渡さなければ出さない（寸法線の表示をオフにしたとき） */
  setbackLines?: SetbackLine[] | null
}

export function Volume3D({
  footprint,
  lot,
  shadow,
  neighbors,
  storeyCount,
  storeyHeightMm,
  homeToken,
  onRotateStart,
  onRotate,
  rotationStep = 'free',
  onStoreyCount,
  setbackLines,
  floors,
}: Volume3DProps) {
  const shadowGeo = useMemo(() => (shadow && shadow.length > 0 ? shadowGeometry(shadow) : null), [shadow])
  // 周辺建物は 1 つの形にまとめて描く（建物ごとに部品を作ると描画の呼び出しが増えすぎる）
  const neighborGeo = useMemo(() => {
    if (!neighbors || neighbors.length === 0) return null
    const triangles = neighbors.flatMap((n) => buildVolumeMesh({ footprint: n.footprint, storey_count: 1, storey_height: n.heightMm }).triangles)
    return toGeometry({ triangles })
  }, [neighbors])
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  // 外形が無いときだけ、敷地と周辺建物の範囲に合わせる（外形が閉じたら枠は無く、今までどおり）
  const sceneFrame = useMemo(
    () => (footprint === null ? sceneFrameOf([...(lot ? [lot] : []), ...(neighbors ?? []).map((n) => n.footprint)], 40) : null),
    [footprint, lot, neighbors],
  )
  // 寸法の表記（DOM）の置き場。側ごとに一つ（SetbackLabels が位置を写す）
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({})
  // つまみを動かしている間の仮の形（表示だけ。store は変えない）。回している間は回した外形を、高さを動かしている間は仮の階数を見せる
  const [knobPreview, setKnobPreview] = useState<KnobPreview | null>(null)
  const shownFootprint = footprint === null ? null : knobPreview?.kind === 'rotate' ? knobPreview.footprint : footprint
  const shownStoreyCount = knobPreview?.kind === 'height' ? knobPreview.storeyCount : storeyCount
  const geometry = useMemo(() => {
    if (footprint === null || shownFootprint === null) return null
    // 段状に切った形は、つまみを動かしていない間だけ出す（動かしている間は外形の押し出しで仮の形を見せる）
    if (floors && floors.length > 0 && !knobPreview) {
      try {
        return toGeometry(stackedMesh(floors, storeyHeightMm))
      } catch {
        // 段状の形が作れないときは、外形の押し出しで出す（画面を落とさない。壊れた階の理由は stackedMesh の floorProblemOf）
      }
    }
    const build = (fp: Point[], storeys: number) => toGeometry(buildVolumeMesh({ footprint: fp, storey_count: storeys, storey_height: storeyHeightMm }))
    // 仮の形が立体にならないとき（丸めで外形が崩れたとき）は、実際の形のまま見せる
    if (shownFootprint !== footprint || shownStoreyCount !== storeyCount) {
      try {
        return build(shownFootprint, shownStoreyCount)
      } catch {
        return build(footprint, storeyCount)
      }
    }
    return build(footprint, storeyCount)
  }, [footprint, shownFootprint, storeyCount, shownStoreyCount, storeyHeightMm, floors, knobPreview])
  // 仮の形を作り直すたびに、古い形の GPU の領域を解放する
  useEffect(() => () => geometry?.dispose(), [geometry])
  // 敷地の面と輪郭（外形の前から。外形と同じ平面の座標）
  const lotPlate = useMemo(() => (lot ? toGeometry({ triangles: lotPlateTrianglesOf(lot) }) : null), [lot])
  const lotLine = useMemo(() => {
    if (!lot || lot.length < 3) return null
    return new THREE.BufferGeometry().setFromPoints(lot.map((p) => new THREE.Vector3(p.x * MM_TO_M, LOT_LIFT_MM * MM_TO_M, p.y * MM_TO_M)))
  }, [lot])
  // 地面の大きさは、外形（無ければ敷地）から。どちらも無ければ地面は出さない
  const groundSource = footprint ?? lot ?? null
  const ground = useMemo(() => (groundSource && groundSource.length > 0 ? groundSize(groundSource) : null), [groundSource])

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
      <FrameCamera frame={sceneFrame} controlsRef={controlsRef} />
      <color attach="background" args={['#f4f4f2']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[30, 50, 20]} intensity={0.8} />
      {geometry && (
        <mesh geometry={geometry}>
          <meshStandardMaterial color="#c9d3dc" side={THREE.DoubleSide} />
        </mesh>
      )}
      {lotPlate && (
        <mesh geometry={lotPlate}>
          <meshStandardMaterial color="#e9e1c9" side={THREE.DoubleSide} />
        </mesh>
      )}
      {lotLine && (
        <lineLoop geometry={lotLine}>
          <lineBasicMaterial color="#3a4a5a" />
        </lineLoop>
      )}
      {neighborGeo && (
        <mesh geometry={neighborGeo}>
          <meshStandardMaterial color="#d8d4c8" side={THREE.DoubleSide} />
        </mesh>
      )}
      {ground && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ground.cx, 0, ground.cz]}>
            <planeGeometry args={[ground.width, ground.depth]} />
            <meshStandardMaterial color="#e6e3dc" />
          </mesh>
          <gridHelper args={[Math.max(ground.width, ground.depth), 20]} position={[ground.cx, 0.001, ground.cz]} />
        </>
      )}
      {setbackLines?.map((l) => (
        <SetbackDimension key={l.side} line={l} />
      ))}
      {setbackLines && <SetbackLabels lines={setbackLines} labels={labelRefs.current} />}
      {shadowGeo && (
        <mesh geometry={shadowGeo}>
          <meshBasicMaterial color="#3a4450" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      {(onRotate || onStoreyCount) && footprint !== null && (
        <VolumeKnobs
          footprint={footprint}
          storeyCount={storeyCount}
          storeyHeightMm={storeyHeightMm}
          preview={knobPreview}
          onPreview={setKnobPreview}
          rotationStep={rotationStep}
          onRotateStart={onRotateStart}
          onRotate={onRotate}
          onStoreyCount={onStoreyCount}
        />
      )}
      <OrbitControls ref={controlsRef} makeDefault />
    </Canvas>
    {setbackLines?.map((l) => (
      <div
        key={l.side}
        ref={(el) => {
          labelRefs.current[l.side] = el
        }}
        style={{ display: 'none', position: 'absolute', top: 0, left: 0, pointerEvents: 'none', fontSize: 12, color: '#1f5f8b', background: 'rgba(255,255,255,0.85)', padding: '0 4px', borderRadius: 3, whiteSpace: 'nowrap' }}
      >
        {l.label}
      </div>
    ))}
    {knobPreview?.kind === 'height' && (
      <div
        style={{ position: 'absolute', left: 8, bottom: 8, padding: '2px 8px', border: '1px solid #b8b2a4', borderRadius: 4, background: '#fff', fontSize: 12, pointerEvents: 'none' }}
      >
        高さ {knobPreview.storeyCount} 階（{(knobPreview.heightMm / 1000).toFixed(1)} m）
      </div>
    )}
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
