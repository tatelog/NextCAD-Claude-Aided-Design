// P2 の 3D 表示（D-04 P2、G42）。押し出しの立体を読み取り専用で出す。
// 3D で見ただけでは線は変わらない（D-04 共通部品「3D への切替」）。描く入力は平面（DrawingCanvas）。
// 座標: 平面の (x, y) mm → three の (x, 高さ, y) m。
import { clipPlanesAt, initialViewOf, lotPlateTrianglesOf, LOT_LIFT_MM, type SceneFrame } from './volumeScene'
import { neighborMeshesOf } from '../volume/neighborMesh'
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { GSI_ATTRIBUTION, type MapTile } from '../map/gsiTiles'
import { Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Point } from '../geom/viewport'
import { buildVolumeMesh, stackedMesh, type VolumeMesh } from '../volume/mesh'
import { triangulatePolygon } from '../geom/triangulate'
import { ViewCube } from './ViewCubePanel'
import { planeMmToScene } from '../volume/sceneSpace'
import type { OverrunFloor, SlopeVertex } from '../volume/slopeSurface'
import type { CubeTarget, Dir } from './viewCube'
import { VolumeKnobs, type KnobPreview } from './VolumeKnobs'
import type { RotationStep } from '../volume/rotation'
import type { SetbackLine } from '../volume/setbackLines'
import { screenPointOf } from './setbackLabelScreen'

// 押した向き（キューブの面・辺・隅）。token が変わると、その向きへ動かす
type FaceRequest = { dir: Dir; token: number }

// 初期のカメラの向き（既定の位置 (40, 40, 50) から、注視点へ向かう逆向き）
const DEFAULT_TO_CAMERA: Dir = (() => {
  const l = Math.hypot(40, 40, 50)
  return { x: 40 / l, y: 40 / l, z: 50 / l }
})()

// ビューキューブで選ばれた向きへ視点を向ける（Canvas の中で、カメラを直接動かす）。距離は今のまま、注視点の周りを回る（代表の依頼 2026-11-06。3）
function CameraDirector({ request, controlsRef }: { request: FaceRequest | null; controlsRef: { current: ComponentRef<typeof OrbitControls> | null } }) {
  const { camera } = useThree()
  const last = useRef<number | null>(null)
  useEffect(() => {
    if (!request || request.token === last.current) return
    last.current = request.token
    const controls = controlsRef.current
    const t = controls ? controls.target : new THREE.Vector3(0, 0, 0)
    const dist = camera.position.distanceTo(t) || 60
    camera.position.set(t.x + request.dir.x * dist, t.y + request.dir.y * dist, t.z + request.dir.z * dist)
    camera.lookAt(t)
    controls?.update()
  }, [request, camera, controlsRef])
  return null
}

// カメラの今の向き（注視点からカメラへ）を、キューブへ渡す。毎フレーム見て、変わったときだけ渡す
function ViewDirSync({ controlsRef, onView }: { controlsRef: { current: ComponentRef<typeof OrbitControls> | null }; onView: (d: Dir) => void }) {
  const { camera } = useThree()
  const last = useRef('')
  useFrame(() => {
    const t = controlsRef.current?.target
    if (!t) return
    const dx = camera.position.x - t.x
    const dy = camera.position.y - t.y
    const dz = camera.position.z - t.z
    const l = Math.hypot(dx, dy, dz) || 1
    const d = { x: dx / l, y: dy / l, z: dz / l }
    const key = `${d.x.toFixed(3)},${d.y.toFixed(3)},${d.z.toFixed(3)}`
    if (key === last.current) return
    last.current = key
    onView(d)
  })
  return null
}

// 外形が無いとき、確定した敷地（と周辺建物）の範囲が画面に収まるように、カメラと目標を置く（統括の依頼 2026-11-06。B）
// ホーム（homeToken が変わったとき）も、同じ初期の視点へ戻す（代表の依頼 2026-11-06。2）
function FrameCamera({
  frame,
  controlsRef,
  homeToken,
}: {
  frame: SceneFrame | null
  controlsRef: { current: ComponentRef<typeof OrbitControls> | null }
  homeToken: number
}) {
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
  }, [frame, camera, controlsRef, homeToken])
  return null
}

// 近い平面と遠い平面を、カメラの今の距離に合わせて作り直す（統括の依頼 2026-11-06（最優先）。拡大で範囲が消えた）。
// 初期の距離のまま固定すると、ホイールで寄ったとき範囲が近い平面の手前に入って切れる。外形が無いときだけ。外形があるときは既定の 0.1 m と 1000 m
const DEFAULT_NEAR_M = 0.1
const DEFAULT_FAR_M = 1000
function ClipPlanes({ frame, controlsRef }: { frame: SceneFrame | null; controlsRef: { current: ComponentRef<typeof OrbitControls> | null } }) {
  const { camera } = useThree()
  const applied = useRef<string | null>(null)
  useFrame(() => {
    let near = DEFAULT_NEAR_M
    let far = DEFAULT_FAR_M
    if (frame) {
      const t = controlsRef.current?.target
      const tx = t ? t.x : frame.target[0]
      const ty = t ? t.y : frame.target[1]
      const tz = t ? t.z : frame.target[2]
      const d = Math.hypot(camera.position.x - tx, camera.position.y - ty, camera.position.z - tz)
      const planes = clipPlanesAt(d, frame.radiusM)
      near = planes.near
      far = planes.far
    }
    // 変わったときだけ、投影の行列を作り直す
    const key = `${near}:${far}`
    if (applied.current === key) return
    applied.current = key
    const perspective = camera as THREE.PerspectiveCamera
    perspective.near = near
    perspective.far = far
    perspective.updateProjectionMatrix()
  })
  return null
}

const MM_TO_M = 1 / 1000

/** 三角形の一覧（mm）を three の形にする。P1 の周辺建物（NeighborScene3D）と同じ変換を使う */
export function toGeometry(mesh: Pick<VolumeMesh, 'triangles'>): THREE.BufferGeometry {
  const positions: number[] = []
  for (const tri of mesh.triangles) {
    for (const v of tri) positions.push(...planeMmToScene(v.x, v.y, v.z))
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
    // 北は −z（sceneSpace.ts）。地面の中心の z も、平面の y の符号を反対にする
    cz: -((minY + maxY) / 2) * MM_TO_M,
  }
}

// 地面に落ちる影（平面の多角形）を、地面のすぐ上の薄い面にする（D-04 P2「地面に日影の影」、G54）
function shadowGeometry(shadows: readonly (readonly Point[])[]): THREE.BufferGeometry {
  const positions: number[] = []
  for (const shadow of shadows) {
    for (const [a, b, c] of triangulatePolygon(shadow)) {
      for (const v of [a, b, c]) positions.push(...planeMmToScene(v.x, v.y, 2))
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

// 敷地からの離れの寸法線（G67）: 平面の mm を three の m に直し、地面の少し上に線を引く。両端と中点（表記を置く点）
function setbackEnds(line: SetbackLine) {
  const a: [number, number, number] = planeMmToScene(line.from.x, line.from.y, 20)
  const b: [number, number, number] = planeMmToScene(line.to.x, line.to.y, 20)
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

// 地理院タイル 1 枚を、地面に貼る（統括の依頼 2026-11-06。4）。四隅は敷地と同じ平面（sceneSpace で three の位置へ）。
// 画像は地理院から読む（CORS を付ける）。地面より少し上（0.5 mm）に置く。
function MapTileMesh({ tile }: { tile: MapTile }) {
  const texture = useLoader(THREE.TextureLoader, tile.url, (loader) => loader.setCrossOrigin('anonymous'))
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace
  }, [texture])
  const geometry = useMemo(() => {
    const c = tile.corners
    const [nw, sw, se, ne] = [c.nw, c.sw, c.se, c.ne].map((p) => planeMmToScene(p.x, p.y, 0.5))
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute([...nw!, ...sw!, ...se!, ...ne!], 3))
    // 画像の上（北）を、平面の北（−z 側）に合わせる
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 1, 1], 2))
    g.setIndex([0, 1, 2, 0, 2, 3])
    return g
  }, [tile])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
    </mesh>
  )
}

// 地図のタイルが読めないときも、3D は描く（タイルだけ出さない。灰色の地面は残す）
class TileErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown): void {
    console.error('地理院タイルを貼れなかった', error)
  }
  render(): ReactNode {
    return this.state.failed ? null : this.props.children
  }
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
  /** 地図（地面と格子）を出すか。省略は出す（代表の依頼 2026-11-06。1） */
  showMap?: boolean
  /** 地理院タイル（確定した地点の周り）。地図を出すときに、地面に貼る（代表の依頼 2026-11-06。4） */
  mapTiles?: MapTile[]
  /** 斜線の面（境界ごとの傾いた四角形）。showSlope のときだけ出す（統括の指示 2026-11-06。5a） */
  slopeSheets?: SlopeVertex[][]
  /** 食い込み（階ごとに、斜線で切られた部分）。showSlope のときだけ、赤く出す（5a） */
  overrunFloors?: OverrunFloor[]
  /** 斜線の面と食い込みを出すか（ボリュームの画面の切り替え。初期は off） */
  showSlope?: boolean
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
  showMap = true,
  mapTiles,
  slopeSheets,
  overrunFloors,
  showSlope = false,
}: Volume3DProps) {
  const shadowGeo = useMemo(() => (shadow && shadow.length > 0 ? shadowGeometry(shadow) : null), [shadow])
  // 周辺建物は 1 つの形にまとめて描く（建物ごとに部品を作ると描画の呼び出しが増えすぎる）
  const neighborGeo = useMemo(() => {
    if (!neighbors || neighbors.length === 0) return null
    const triangles = neighborMeshesOf(neighbors).flatMap((m) => m.triangles)
    return toGeometry({ triangles })
  }, [neighbors])
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  // 初期の視点（代表の依頼 2026-11-06。2）: 確定した敷地だけを、南から北を向く正面で収める。外形が閉じていても使う。敷地が無ければ無し
  const sceneFrame = useMemo(() => initialViewOf(lot ?? null, 40), [lot])
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
  const lotPlate = useMemo(() => {
    const triangles = lot ? lotPlateTrianglesOf(lot) : []
    return triangles.length > 0 ? toGeometry({ triangles }) : null
  }, [lot])
  const lotLine = useMemo(() => {
    if (!lot || lot.length < 3) return null
    return new THREE.BufferGeometry().setFromPoints(lot.map((p) => new THREE.Vector3(...planeMmToScene(p.x, p.y, LOT_LIFT_MM))))
  }, [lot])
  // 斜線の面（半透明の傾いた四角形。境界の線の上で rise、距離 D で rise + coef × D）（統括の指示 2026-11-06。5a）
  const sheetGeo = useMemo(() => {
    if (!showSlope || !slopeSheets || slopeSheets.length === 0) return null
    const positions: number[] = []
    for (const q of slopeSheets) {
      for (const i of [0, 1, 2, 0, 2, 3]) {
        const v = q[i]!
        positions.push(...planeMmToScene(v.x, v.y, v.hMm))
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return g
  }, [showSlope, slopeSheets])
  useEffect(() => () => sheetGeo?.dispose(), [sheetGeo])
  // 食い込み（切られた部分を、階の高さの範囲で立体にする。赤く半透明）
  const overrunGeo = useMemo(() => {
    if (!showSlope || !overrunFloors || overrunFloors.length === 0) return null
    const triangles: VolumeMesh['triangles'][number][] = []
    for (const f of overrunFloors) {
      for (const piece of f.pieces) {
        try {
          const m = buildVolumeMesh({ footprint: piece, storey_count: 1, storey_height: f.topMm - f.baseMm })
          for (const tri of m.triangles) triangles.push(tri.map((v) => ({ x: v.x, y: v.y, z: v.z + f.baseMm })) as VolumeMesh['triangles'][number])
        } catch {
          // 切られた形が立体にならないときは、その部分だけ出さない（画面を落とさない）
        }
      }
    }
    return triangles.length > 0 ? toGeometry({ triangles }) : null
  }, [showSlope, overrunFloors])
  useEffect(() => () => overrunGeo?.dispose(), [overrunGeo])

  // 地面の大きさは、外形（無ければ敷地）から。どちらも無ければ地面は出さない
  const groundSource = footprint ?? lot ?? null
  const ground = useMemo(() => (groundSource && groundSource.length > 0 ? groundSize(groundSource) : null), [groundSource])

  const [faceRequest, setFaceRequest] = useState<FaceRequest | null>(null)
  // カメラの今の向き（キューブの見え方に使う）
  const [viewDir, setViewDir] = useState<Dir>(DEFAULT_TO_CAMERA)

  // ホームの押下: 敷地の初期の視点があれば、FrameCamera が同じ視点へ戻す。無ければ、今までどおり既定に戻す
  const lastHome = useRef(homeToken)
  if (lastHome.current !== homeToken) {
    lastHome.current = homeToken
    if (!sceneFrame) controlsRef.current?.reset()
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <Canvas camera={{ position: [40, 40, 50], fov: 40 }}>
      <CameraDirector request={faceRequest} controlsRef={controlsRef} />
      <ViewDirSync controlsRef={controlsRef} onView={setViewDir} />
      <FrameCamera frame={sceneFrame} controlsRef={controlsRef} homeToken={homeToken} />
      <ClipPlanes frame={sceneFrame} controlsRef={controlsRef} />
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
      {ground && showMap && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ground.cx, 0, ground.cz]}>
            <planeGeometry args={[ground.width, ground.depth]} />
            <meshStandardMaterial color="#e6e3dc" />
          </mesh>
          <gridHelper args={[Math.max(ground.width, ground.depth), 20]} position={[ground.cx, 0.001, ground.cz]} />
        </>
      )}
      {showMap && mapTiles && mapTiles.length > 0 && (
        <TileErrorBoundary>
          <Suspense fallback={null}>
            {mapTiles.map((t) => (
              <MapTileMesh key={t.url} tile={t} />
            ))}
          </Suspense>
        </TileErrorBoundary>
      )}
      {setbackLines?.map((l) => (
        <SetbackDimension key={l.side} line={l} />
      ))}
      {setbackLines && <SetbackLabels lines={setbackLines} labels={labelRefs.current} />}
      {sheetGeo && (
        <mesh geometry={sheetGeo}>
          <meshBasicMaterial color="#b5533c" opacity={0.22} transparent depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      {overrunGeo && (
        <mesh geometry={overrunGeo}>
          <meshBasicMaterial color="#c0392b" opacity={0.45} transparent depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
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
    {showMap && mapTiles && mapTiles.length > 0 && (
      <div style={{ position: 'absolute', left: 6, bottom: 4, fontSize: 10, color: '#444', background: 'rgba(255,255,255,0.85)', padding: '0 4px', borderRadius: 3, pointerEvents: 'none' }}>
        {GSI_ATTRIBUTION}
      </div>
    )}
    {knobPreview?.kind === 'height' && (
      <div
        style={{ position: 'absolute', left: 8, bottom: 8, padding: '2px 8px', border: '1px solid #b8b2a4', borderRadius: 4, background: '#fff', fontSize: 12, pointerEvents: 'none' }}
      >
        高さ {knobPreview.storeyCount} 階（{(knobPreview.heightMm / 1000).toFixed(1)} m）
      </div>
    )}
    <div style={{ position: 'absolute', top: 8, right: 8 }}>
      <ViewCube toCamera={viewDir} onPick={(t: CubeTarget) => setFaceRequest((prev) => ({ dir: t.dir, token: (prev?.token ?? 0) + 1 }))} />
    </div>
    </div>
  )
}
