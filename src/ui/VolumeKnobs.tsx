// 3D のつまみ（ハブ A-03 G71 の回転、G65 の高さ。D-04 P2）。Volume3D の Canvas の中に置く。
// 回転のつまみ: 外形のすべての頂点に 1 つずつ置く（仮置き。どの角をつまんでも、重心のまわりに回す動きは同じ）。
//   つまんで動かすと、外形を重心のまわりに回した仮の形を見せ（store は変えない）、
//   離したときに、刻みで丸めた角度を 1 回だけ渡して確定する（確定は呼び出し側。つまんだ時点の外形に rotateOutline を当てる）。
// 高さのつまみ: 上面の中央（外形の重心の真上）に 1 つ置く。つまんで動かすと、指の高さに追従した階数の仮の形を見せ（store は変えない）、
//   離したときに、最も近い整数の階数（1 以上・上限 30）を 1 回だけ渡して確定する。動かす値（階数）はハブでは未決の仮置き。
// つまみの上で押しているあいだは、カメラの回転（OrbitControls）を止める。大きさは画面で一定。数値は仮置き。
// 指・マウス・ペンのどれでも Pointer Events で一つに扱い、入力の種類で挙動を変えない。
import { useFrame, useStore, type RootStore, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import type { Point } from '../geom/viewport'
import {
  axisHeightAtRayMm,
  dragHeightMm,
  knobRotationDeg,
  rayHitPlaneMm,
  rotatedFootprint,
  rotationKnobSpots,
  scenePosition,
  storeyCountFromHeight,
} from '../volume/knobs3d'
import { outlineCentroid, type RotationStep } from '../volume/rotation'

/** 見た目は小さく、近接・タッチの当たり判定は別に確保する。 */
const KNOB_RADIUS_PX = 6
const KNOB_HIT_RADIUS_PX = 20
const ROTATE_COLOR = '#e07b1f'
const ROTATE_ACTIVE_COLOR = '#f5a04a'
const HEIGHT_COLOR = '#2a6fdb'
const HEIGHT_ACTIVE_COLOR = '#5b97f0'

/** つまみを動かしている間の仮の形（表示だけ。store は変えない）。回転の vertex は、つまんだ頂点の番号（外形の頂点の順。そのつまみだけ色を変える）。 */
export type KnobPreview =
  | { kind: 'rotate'; deg: number; footprint: Point[]; vertex: number }
  | { kind: 'height'; storeyCount: number; heightMm: number }

type PointerHandler = (e: ThreeEvent<PointerEvent>) => void
interface KnobHandlers {
  onPointerDown: PointerHandler
  onPointerMove: PointerHandler
  onPointerUp: PointerHandler
}

type PointerCapturable = { setPointerCapture(id: number): void; releasePointerCapture(id: number): void }
// R3F のイベントの target は、つかんだ物を捕捉するための窓口（DOM の型には無いので型だけ付ける）
const capturable = (e: ThreeEvent<PointerEvent>): PointerCapturable => e.target as unknown as PointerCapturable

/** カメラの回転（OrbitControls。makeDefault で store に入る）の入り切り。 */
function setCameraEnabled(store: RootStore, enabled: boolean): void {
  const controls = store.getState().controls as unknown as { enabled: boolean } | null
  if (controls) controls.enabled = enabled
}

/** 画面の大きさが一定（半径 KNOB_RADIUS_PX の px）になるよう、毎フレーム拡大率を合わせる。中の形は半径 1 で作る。 */
function ScreenScaled({ position, handlers, children }: { position: [number, number, number]; handlers: KnobHandlers; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const [near, setNear] = useState(false)
  const [active, setActive] = useState(false)
  const store = useStore()
  useEffect(() => {
    const canvas = store.getState().gl.domElement
    const reset = () => { setNear(false); setActive(false) }
    canvas.addEventListener('pointercancel', reset)
    canvas.addEventListener('lostpointercapture', reset)
    return () => {
      canvas.removeEventListener('pointercancel', reset)
      canvas.removeEventListener('lostpointercapture', reset)
    }
  }, [store])
  useFrame(({ camera, size }) => {
    const group = ref.current
    if (!group || size.height <= 0 || !(camera instanceof THREE.PerspectiveCamera)) return
    const worldPerPx = (2 * camera.position.distanceTo(group.position) * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / size.height
    group.scale.setScalar(worldPerPx * KNOB_RADIUS_PX)
  })
  return (
    <group ref={ref} position={position}
      onPointerOver={() => setNear(true)}
      onPointerOut={() => setNear(false)}
      onPointerDown={(e) => { setActive(true); handlers.onPointerDown(e) }}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={(e) => { setActive(false); handlers.onPointerUp(e) }}
    >
      {/* 透明の近接領域。表示を隠しても操作対象は維持する。 */}
      <mesh>
        <sphereGeometry args={[KNOB_HIT_RADIUS_PX / KNOB_RADIUS_PX, 16, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <group visible={near || active}>{children}</group>
    </group>
  )
}

/** つまみの見た目: 白い縁の丸。建物の陰でも見えるよう、奥行きの判定をせず最後に描く。 */
function KnobBall({ color }: { color: string }) {
  return (
    <>
      <mesh renderOrder={10}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial color="#ffffff" transparent depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh renderOrder={11}>
        <sphereGeometry args={[0.7, 24, 16]} />
        <meshBasicMaterial color={color} transparent depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  )
}

interface RotateDrag {
  kind: 'rotate'
  pointerId: number
  /** つまんだ頂点の番号（外形の頂点の順） */
  index: number
  /** つまんだ時点の外形（表示中の外形のコピー） */
  base: Point[]
  /** 回転の中心（base の重心） */
  pivot: Point
  /** つまんだ点（地面の上。mm） */
  grab: Point
  /** いまの回す量（°。刻みで丸めた値） */
  deg: number
}

interface HeightDrag {
  kind: 'height'
  pointerId: number
  /** 軸の位置（外形の重心。平面の mm） */
  axis: Point
  /** つまんだ時点の階数と高さ（mm） */
  startStoreys: number
  startHeightMm: number
  /** つまんだ時点の指の高さ（軸の上で視線にいちばん近い点。mm） */
  grabHeightMm: number
  /** いまの階数（指の高さに追従した、最も近い整数。1 以上・上限 30） */
  storeys: number
}

type Drag = RotateDrag | HeightDrag

export interface VolumeKnobsProps {
  /** いまの外形（mm）。すべての頂点に回転のつまみを、重心の真上（上面の中央）に高さのつまみを置く。 */
  footprint: readonly Point[]
  /** いまの階数と階高（mm）。高さのつまみは階数 × 階高の高さに置く。 */
  storeyCount: number
  storeyHeightMm: number
  /** 動かしている間の仮の形（親が持つ。表示だけ）。null は動かしていない。 */
  preview: KnobPreview | null
  onPreview: (preview: KnobPreview | null) => void
  /** 回転の刻み（右パネルの刻み） */
  rotationStep: RotationStep
  /** 回転のつまみをつまんだとき（つまんだ時点の外形を覚えるため） */
  onRotateStart?: () => void
  /** 離したとき: 回す量（°、反時計回り）。0°（動かしていない）のときは呼ばない。渡さなければ回転のつまみは出さない。 */
  onRotate?: (deg: number) => void
  /** 離したとき: 新しい階数（1 以上・上限 30）。いまの階数と同じときは呼ばない。渡さなければ高さのつまみは出さない。 */
  onStoreyCount?: (n: number) => void
}

export function VolumeKnobs({
  footprint,
  storeyCount,
  storeyHeightMm,
  preview,
  onPreview,
  rotationStep,
  onRotateStart,
  onRotate,
  onStoreyCount,
}: VolumeKnobsProps) {
  const store = useStore()
  const drag = useRef<Drag | null>(null)

  // 取り消し（pointercancel。OS がタッチを取り上げたとき）: 確定せずに元の形へ戻し、カメラも戻す
  useEffect(() => {
    const canvas = store.getState().gl.domElement
    const onCancel = (ev: PointerEvent) => {
      if (drag.current?.pointerId !== ev.pointerId) return
      drag.current = null
      setCameraEnabled(store, true)
      onPreview(null)
    }
    canvas.addEventListener('pointercancel', onCancel)
    return () => canvas.removeEventListener('pointercancel', onCancel)
  }, [store, onPreview])

  // 動かしている途中でこの部品が外れたら、カメラを元に戻す
  useEffect(
    () => () => {
      if (drag.current) {
        drag.current = null
        setCameraEnabled(store, true)
      }
    },
    [store],
  )

  // 高さのつまみは上面の中央（外形の重心の真上）。回転のつまみは外形のすべての頂点（回している間は、回した外形の同じ番号の頂点）
  const roofCenter = outlineCentroid(footprint)
  if (footprint.length < 3 || !roofCenter) return null
  const rotateSpots = rotationKnobSpots(footprint)
  const shownOutline = preview?.kind === 'rotate' ? preview.footprint : footprint

  // 番号 index の頂点のつまみの動き。どのつまみも動きは同じ（つまんだ頂点の番号だけが違う）
  const onRotateDown = (index: number): PointerHandler => (e) => {
    e.stopPropagation()
    const base = footprint.map((p) => ({ x: p.x, y: p.y }))
    const pivot = outlineCentroid(base)
    const vertex = base[index]
    if (!pivot || !vertex) return
    // つまんだ点は、視線と地面の交点。外れたとき（地面と交わらない視線）はつまんだ頂点
    const grab = rayHitPlaneMm(e.ray.origin, e.ray.direction, 0) ?? vertex
    drag.current = { kind: 'rotate', pointerId: e.pointerId, index, base, pivot, grab, deg: 0 }
    setCameraEnabled(store, false)
    capturable(e).setPointerCapture(e.pointerId)
    onRotateStart?.()
  }

  const onRotateMove = (index: number): PointerHandler => (e) => {
    const d = drag.current
    // つまんだつまみだけが受け取る（動かしている途中で指が別のつまみの上を通っても、そちらは何もしない）
    if (d?.kind !== 'rotate' || d.pointerId !== e.pointerId || d.index !== index) return
    e.stopPropagation()
    const p = rayHitPlaneMm(e.ray.origin, e.ray.direction, 0)
    if (!p) return
    const deg = knobRotationDeg(d.pivot, d.grab, p, rotationStep)
    if (deg === d.deg) return
    d.deg = deg
    onPreview({ kind: 'rotate', deg, footprint: rotatedFootprint(d.base, d.pivot, deg), vertex: d.index })
  }

  const onRotateUp = (index: number): PointerHandler => (e) => {
    const d = drag.current
    if (d?.kind !== 'rotate' || d.pointerId !== e.pointerId || d.index !== index) return
    e.stopPropagation()
    drag.current = null
    setCameraEnabled(store, true)
    capturable(e).releasePointerCapture(e.pointerId)
    onPreview(null)
    if (d.deg !== 0) onRotate?.(d.deg)
  }

  const onHeightDown: PointerHandler = (e) => {
    e.stopPropagation()
    const startHeightMm = storeyCount * storeyHeightMm
    // つまんだ時点の指の高さ。決められないとき（真上から見ているとき）は、つまみの高さ（動かしても変わらない）
    const grabHeightMm = axisHeightAtRayMm(e.ray.origin, e.ray.direction, roofCenter) ?? startHeightMm
    drag.current = { kind: 'height', pointerId: e.pointerId, axis: roofCenter, startStoreys: storeyCount, startHeightMm, grabHeightMm, storeys: storeyCount }
    setCameraEnabled(store, false)
    capturable(e).setPointerCapture(e.pointerId)
  }

  const onHeightMove: PointerHandler = (e) => {
    const d = drag.current
    if (d?.kind !== 'height' || d.pointerId !== e.pointerId) return
    e.stopPropagation()
    const nowMm = axisHeightAtRayMm(e.ray.origin, e.ray.direction, d.axis)
    if (nowMm === null) return
    // 建物の高さ（階数 × 階高）が指の高さに追従する。見せるのは最も近い整数の階数（離したときに確定する階数と同じ）
    const storeys = storeyCountFromHeight(dragHeightMm(d.startHeightMm, d.grabHeightMm, nowMm), storeyHeightMm)
    if (storeys === d.storeys) return
    d.storeys = storeys
    onPreview({ kind: 'height', storeyCount: storeys, heightMm: storeys * storeyHeightMm })
  }

  const onHeightUp: PointerHandler = (e) => {
    const d = drag.current
    if (d?.kind !== 'height' || d.pointerId !== e.pointerId) return
    e.stopPropagation()
    drag.current = null
    setCameraEnabled(store, true)
    capturable(e).releasePointerCapture(e.pointerId)
    onPreview(null)
    if (d.storeys !== d.startStoreys) onStoreyCount?.(d.storeys)
  }

  // 高さのつまみは、動かしている間は仮の階数の上面に置く
  const shownStoreys = preview?.kind === 'height' ? preview.storeyCount : storeyCount

  return (
    <>
      {onRotate &&
        rotateSpots.map(({ index, point }) => (
          <ScreenScaled
            key={index}
            position={scenePosition(shownOutline[index] ?? point, 0)}
            handlers={{ onPointerDown: onRotateDown(index), onPointerMove: onRotateMove(index), onPointerUp: onRotateUp(index) }}
          >
            <KnobBall color={preview?.kind === 'rotate' && preview.vertex === index ? ROTATE_ACTIVE_COLOR : ROTATE_COLOR} />
          </ScreenScaled>
        ))}
      {onStoreyCount && (
        <ScreenScaled
          position={scenePosition(roofCenter, shownStoreys * storeyHeightMm)}
          handlers={{ onPointerDown: onHeightDown, onPointerMove: onHeightMove, onPointerUp: onHeightUp }}
        >
          <KnobBall color={preview?.kind === 'height' ? HEIGHT_ACTIVE_COLOR : HEIGHT_COLOR} />
        </ScreenScaled>
      )}
    </>
  )
}
