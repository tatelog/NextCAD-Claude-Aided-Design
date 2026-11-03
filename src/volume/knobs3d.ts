// 3D のつまみ（ハブ A-03 G71 の回転、G65 の高さ。D-04 P2）の純粋な処理。描画にも状態にも依存しない。
// 平面の (x, y) mm は three の (x, 高さ, z) m に対応する（z が y。Volume3D と同じ）。数値は仮置き。
// 回す処理そのものは canvas/outlineEdit.ts の rotateOutline、刻みは rotation.ts の snapAngle。
// 高さのつまみが動かす値は、ハブでは未決。今回の仮置きは階数（階高は右パネルの値のまま）。
import type { Point } from '../geom/viewport'
import { rotateFootprint } from './placement'
import { roundFootprintMm, snapAngle, type RotationStep } from './rotation'

const MM_PER_M = 1000

/** three の座標（m）。THREE.Vector3 もそのまま渡せる。 */
export interface Vec3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

/** 平面の点（mm）と高さ（mm）を、3D の位置（three の x・高さ・z。m）にする。-0 は 0 にそろえる。 */
export function scenePosition(p: Point, heightMm: number): [number, number, number] {
  return [p.x / MM_PER_M + 0, heightMm / MM_PER_M + 0, p.y / MM_PER_M + 0]
}

/**
 * 視線（origin から direction の向き）が、高さ planeHeightM（m）の水平な面と交わる点を、平面の mm で返す。
 * 面と平行（向きの高さ成分が 0）、または面が視線の後ろ側にあるときは交わらないので null。
 * direction は正規化していなくてよい。
 */
export function rayHitPlaneMm(origin: Vec3, direction: Vec3, planeHeightM: number): Point | null {
  if (!(Math.abs(direction.y) > 1e-9)) return null
  const t = (planeHeightM - origin.y) / direction.y
  if (!Number.isFinite(t) || t <= 0) return null
  return {
    x: (origin.x + t * direction.x) * MM_PER_M + 0,
    y: (origin.z + t * direction.z) * MM_PER_M + 0,
  }
}

/**
 * 回転のつまみ（G71）: 重心 pivot から見て、つまんだ点 grab の向きから、今の指の位置 current の向きまでの差（°）。
 * 反時計回りが正（mm の +y が画面の上。rotateOutline と同じ向き）。結果は (-180, 180]。真後ろは +180°。
 * 向きが決まらないとき（つまんだ点か指の位置が重心と同じ）と、数でない入力は 0°。
 */
export function knobAngleDeg(pivot: Point, grab: Point, current: Point): number {
  const ax = grab.x - pivot.x
  const ay = grab.y - pivot.y
  const bx = current.x - pivot.x
  const by = current.y - pivot.y
  if (![ax, ay, bx, by].every(Number.isFinite)) return 0
  if ((ax === 0 && ay === 0) || (bx === 0 && by === 0)) return 0
  const cross = ax * by - ay * bx
  const dot = ax * bx + ay * by
  if (cross === 0 && dot < 0) return 180
  return (Math.atan2(cross, dot) * 180) / Math.PI + 0
}

/** 回す量（°）。向きの差を、右パネルの刻み（自由・15°・90°）で丸める。0° は -0 にしない。 */
export function knobRotationDeg(pivot: Point, grab: Point, current: Point, step: RotationStep): number {
  return snapAngle(knobAngleDeg(pivot, grab, current), step)
}

/**
 * 外形 base を pivot のまわりに deg 度（反時計回り）回した、動かしている間の仮の外形。
 * 離したときに rotateOutline が確定する外形と同じ頂点（整数 mm に丸める。-0 は 0）。入力は書き換えない。
 */
export function rotatedFootprint(base: readonly Point[], pivot: Point, deg: number): Point[] {
  return roundFootprintMm(rotateFootprint(base, pivot, deg))
}

/** 階数の上限（G65 の高さのつまみ。仮置き）。 */
export const MAX_STOREYS = 30

/**
 * 高さのつまみ（G65）: 高さ（mm）を階高で割って、最も近い整数の階数にする（四捨五入。ちょうど半分は切り上げ）。
 * 1 以上、上限は MAX_STOREYS に丸める。階高が 0 以下、高さや階高が数でないときは 1 階。
 */
export function storeyCountFromHeight(heightMm: number, storeyHeightMm: number): number {
  if (!Number.isFinite(heightMm) || !Number.isFinite(storeyHeightMm) || storeyHeightMm <= 0) return 1
  return Math.min(MAX_STOREYS, Math.max(1, Math.round(heightMm / storeyHeightMm)))
}

// 視線が鉛直から 5° 以内（真上から見下ろす）だと、軸の上の点が決まらない（指の動きに対して高さの変わり方が大きすぎる）
const NEAR_VERTICAL_SIN2 = Math.sin((5 * Math.PI) / 180) ** 2

/**
 * 高さのつまみ（G65）: 平面の点 axisMm の真上に立つ鉛直な軸の上で、視線（origin から direction の向き）にいちばん近い点の高さ（mm）。
 * 視線が鉛直から 5° 以内（真上や真下から見る）、向きが零、数でない入力のときは、高さを決められないので null。
 * direction は正規化していなくてよい。
 */
export function axisHeightAtRayMm(origin: Vec3, direction: Vec3, axisMm: Point): number | null {
  const len = Math.hypot(direction.x, direction.y, direction.z)
  if (!(len > 0) || !Number.isFinite(len)) return null
  const dx = direction.x / len
  const dy = direction.y / len
  const dz = direction.z / len
  const sin2 = 1 - dy * dy
  if (!(sin2 >= NEAR_VERTICAL_SIN2)) return null
  // 軸は点 (ax, 0, az) を通る鉛直な直線、視線は origin + s * d。二つの直線がいちばん近づく点の、軸の上の高さ t（m）
  const wx = origin.x - axisMm.x / MM_PER_M
  const wz = origin.z - axisMm.y / MM_PER_M
  const t = (origin.y - dy * (dx * wx + dy * origin.y + dz * wz)) / sin2
  return Number.isFinite(t) ? t * MM_PER_M + 0 : null
}

/**
 * 高さのつまみ（G65）: つまんだ時点の高さ startHeightMm から、指の高さが grabHeightMm から nowHeightMm へ動いた分だけ変えた高さ（mm）。
 * つまんだ点がつまみの中心から外れていても、動かさなければ跳ばない。
 */
export function dragHeightMm(startHeightMm: number, grabHeightMm: number, nowHeightMm: number): number {
  return startHeightMm + (nowHeightMm - grabHeightMm)
}
