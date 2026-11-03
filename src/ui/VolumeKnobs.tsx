// 3D のつまみ（ハブ A-03 G71 の回転。D-04 P2）。Volume3D の Canvas の中に置く。
// 外形の頂点 0 に回転のつまみを 1 つ置く。つまんで動かすと、外形を重心のまわりに回した仮の形を見せ（store は変えない）、
// 離したときに、刻みで丸めた角度を 1 回だけ渡して確定する（確定は呼び出し側。つまんだ時点の外形に rotateOutline を当てる）。
// つまみの上で押しているあいだは、カメラの回転（OrbitControls）を止める。大きさは画面で一定。数値は仮置き。
// 指・マウス・ペンのどれでも Pointer Events で一つに扱い、入力の種類で挙動を変えない。
import { useFrame, useStore, type RootStore, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import type { Point } from '../geom/viewport'
import { knobRotationDeg, rayHitPlaneMm, rotatedFootprint, scenePosition } from '../volume/knobs3d'
import { outlineCentroid, type RotationStep } from '../volume/rotation'

/** つまみの半径（画面の px）。仮置き。2D のつまみの当たり判定（半径 12 px）より少し大きくする（指で押すため）。 */
const KNOB_RADIUS_PX = 14
const ROTATE_COLOR = '#e07b1f'
const ROTATE_ACTIVE_COLOR = '#f5a04a'

/** つまみを動かしている間の仮の形（表示だけ。store は変えない）。 */
export type KnobPreview = { kind: 'rotate'; deg: number; footprint: Point[] }

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
  useFrame(({ camera, size }) => {
    const group = ref.current
    if (!group || size.height <= 0 || !(camera instanceof THREE.PerspectiveCamera)) return
    const worldPerPx = (2 * camera.position.distanceTo(group.position) * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / size.height
    group.scale.setScalar(worldPerPx * KNOB_RADIUS_PX)
  })
  return (
    <group ref={ref} position={position} {...handlers}>
      {children}
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
  pointerId: number
  /** つまんだ時点の外形（表示中の外形のコピー） */
  base: Point[]
  /** 回転の中心（base の重心） */
  pivot: Point
  /** つまんだ点（地面の上。mm） */
  grab: Point
  /** いまの回す量（°。刻みで丸めた値） */
  deg: number
}

export interface VolumeKnobsProps {
  /** いまの外形（mm）。頂点 0 に回転のつまみを置く。 */
  footprint: readonly Point[]
  /** 動かしている間の仮の形（親が持つ。表示だけ）。null は動かしていない。 */
  preview: KnobPreview | null
  onPreview: (preview: KnobPreview | null) => void
  /** 回転の刻み（右パネルの刻み） */
  rotationStep: RotationStep
  /** つまんだとき（つまんだ時点の外形を覚えるため） */
  onRotateStart?: () => void
  /** 離したとき: 回す量（°、反時計回り）。0°（動かしていない）のときは呼ばない。 */
  onRotate: (deg: number) => void
}

export function VolumeKnobs({ footprint, preview, onPreview, rotationStep, onRotateStart, onRotate }: VolumeKnobsProps) {
  const store = useStore()
  const rotateDrag = useRef<RotateDrag | null>(null)

  // 取り消し（pointercancel。OS がタッチを取り上げたとき）: 確定せずに元の形へ戻し、カメラも戻す
  useEffect(() => {
    const canvas = store.getState().gl.domElement
    const onCancel = (ev: PointerEvent) => {
      if (rotateDrag.current?.pointerId !== ev.pointerId) return
      rotateDrag.current = null
      setCameraEnabled(store, true)
      onPreview(null)
    }
    canvas.addEventListener('pointercancel', onCancel)
    return () => canvas.removeEventListener('pointercancel', onCancel)
  }, [store, onPreview])

  // 動かしている途中でこの部品が外れたら、カメラを元に戻す
  useEffect(
    () => () => {
      if (rotateDrag.current) {
        rotateDrag.current = null
        setCameraEnabled(store, true)
      }
    },
    [store],
  )

  // 回している間は、回した外形の頂点 0 にある。動かしていないときは、いまの外形の頂点 0
  const vertex0 = (preview?.footprint ?? footprint)[0]
  if (footprint.length < 3 || !vertex0) return null

  const onDown: PointerHandler = (e) => {
    e.stopPropagation()
    const base = footprint.map((p) => ({ x: p.x, y: p.y }))
    const pivot = outlineCentroid(base)
    if (!pivot) return
    // つまんだ点は、視線と地面の交点。外れたとき（地面と交わらない視線）は頂点 0
    const grab = rayHitPlaneMm(e.ray.origin, e.ray.direction, 0) ?? base[0]!
    rotateDrag.current = { pointerId: e.pointerId, base, pivot, grab, deg: 0 }
    setCameraEnabled(store, false)
    capturable(e).setPointerCapture(e.pointerId)
    onRotateStart?.()
  }

  const onMove: PointerHandler = (e) => {
    const d = rotateDrag.current
    if (!d || d.pointerId !== e.pointerId) return
    e.stopPropagation()
    const p = rayHitPlaneMm(e.ray.origin, e.ray.direction, 0)
    if (!p) return
    const deg = knobRotationDeg(d.pivot, d.grab, p, rotationStep)
    if (deg === d.deg) return
    d.deg = deg
    onPreview({ kind: 'rotate', deg, footprint: rotatedFootprint(d.base, d.pivot, deg) })
  }

  const onUp: PointerHandler = (e) => {
    const d = rotateDrag.current
    if (!d || d.pointerId !== e.pointerId) return
    e.stopPropagation()
    rotateDrag.current = null
    setCameraEnabled(store, true)
    capturable(e).releasePointerCapture(e.pointerId)
    onPreview(null)
    if (d.deg !== 0) onRotate(d.deg)
  }

  return (
    <ScreenScaled
      position={scenePosition(vertex0, 0)}
      handlers={{ onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp }}
    >
      <KnobBall color={preview?.kind === 'rotate' ? ROTATE_ACTIVE_COLOR : ROTATE_COLOR} />
    </ScreenScaled>
  )
}
