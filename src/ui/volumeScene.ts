// 外形の前から出す 3D（統括の依頼 2026-11-06。4）。外形が閉じていなくても、確定した敷地か周辺建物があれば、それを先に見せる。決定論。
import type { Point } from '../geom/viewport'
import { triangulatePolygon } from '../geom/triangulate'
import type { VolumeMesh } from '../volume/mesh'
import { planeMmToScene } from '../volume/sceneSpace'

/** 敷地の面を、地面より少し上に置く高さ（mm）。地面と重ならないように */
export const LOT_LIFT_MM = 2

/** 3D を出すか。外形（立体）・確定した敷地・周辺建物のどれかがあれば出す */
export function shouldShowScene3DOf(input: { hasVolume: boolean; hasLot: boolean; neighborCount: number }): boolean {
  return input.hasVolume || input.hasLot || input.neighborCount > 0
}

/** 敷地の面の三角形（mm）。平面（x・y）の座標は外形と同じで、高さだけ地面より少し上 */
export function lotPlateTrianglesOf(lot: readonly Point[]): VolumeMesh['triangles'] {
  // 数でない点は除く。退化した敷地（点が 3 つ未満・面積 0）は板を作らない（統括の依頼 2026-11-06（急ぎ）。4）
  const finite = lot.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  if (finite.length < 3) return []
  let triangles: ReturnType<typeof triangulatePolygon>
  try {
    triangles = triangulatePolygon(finite)
  } catch {
    return []
  }
  return triangles.map(([a, b, c]) => [
    { x: a.x, y: a.y, z: LOT_LIFT_MM },
    { x: b.x, y: b.y, z: LOT_LIFT_MM },
    { x: c.x, y: c.y, z: LOT_LIFT_MM },
  ])
}

/** 範囲に合わせるカメラ（統括の依頼 2026-11-06。B）。目標・球の半径・カメラの位置（いずれも m。y は上向き） */
export interface SceneFrame {
  target: [number, number, number]
  radiusM: number
  distanceM: number
  position: [number, number, number]
}

const DEFAULT_VIEW_OFFSET = [40, 40, 50]
const FRAME_MARGIN = 1.15

/** 範囲（平面 mm の多角形の並び）に合わせるカメラを決める。範囲が無ければ null。目標は範囲の中心、カメラは既定の向きのまま、球が縦の視野（fovDeg）に入る距離に置く */
export function sceneFrameOf(polygonsMm: readonly (readonly Point[])[], fovDeg: number): SceneFrame | null {
  // 数でない点は無視する（統括の依頼 2026-11-06（急ぎ）。4）
  const pts = polygonsMm.flat().filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  if (pts.length === 0) return null
  // 3D の位置（m）に直してから範囲を取る（北は −z。sceneSpace.ts）
  const scene = pts.map((p) => planeMmToScene(p.x, p.y, 0))
  const xs = scene.map((s) => s[0])
  const zs = scene.map((s) => s[2])
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2
  const radiusM = Math.max(1, ...scene.map((s) => Math.hypot(s[0] - cx, s[2] - cz)))
  const distanceM = (radiusM / Math.sin((fovDeg / 2) * (Math.PI / 180))) * FRAME_MARGIN
  const len = Math.hypot(...DEFAULT_VIEW_OFFSET)
  const [ox, oy, oz] = DEFAULT_VIEW_OFFSET.map((v) => (v / len) * distanceM)
  return {
    target: [cx, 0, cz],
    radiusM,
    distanceM,
    position: [cx + ox!, oy!, cz + oz!],
  }
}

/** 範囲に合わせるカメラの近い平面と遠い平面（m）。初期の距離（枠を作ったときの距離）で決める。範囲の点は、この間に必ず入る（既定の遠い平面 1000 m では、範囲が切れて空に見えた。統括の依頼 2026-11-06） */
export function clipPlanesOf(frame: SceneFrame): { near: number; far: number } {
  return clipPlanesAt(frame.distanceM, frame.radiusM)
}

/**
 * カメラが目標から distanceM の距離にあるときの、近い平面と遠い平面（m）。範囲は目標から radiusM 以内。
 * 近い平面は、範囲の一番近い点（d − r）の半分まで（0.01 m 未満にはしない）。遠い平面は一番遠い点（d + r）の 2 倍まで。
 * カメラが動くたびに、今の距離で作り直す。初期の距離のままだと、寄せたときに範囲が近い平面の手前に入って消える（統括の依頼 2026-11-06。最優先）
 */
export function clipPlanesAt(distanceM: number, radiusM: number): { near: number; far: number } {
  const d = Math.max(0, distanceM)
  const r = Math.max(0, radiusM)
  return {
    near: Math.max(0.01, (d - r) * 0.5),
    far: (d + r) * 2,
  }
}

/** 初期の視点の仰角（度）。南から北を向く正面から、上へこの角度だけ見下ろす（真横だと敷地が一本の線に見えるため。統括へ報告） */
const INITIAL_VIEW_ELEVATION_DEG = 45

/**
 * 初期の視点（代表の依頼 2026-11-06。2）。確定した敷地（筆）だけを範囲にし、南から北を向く正面から、上へ 45° 見下ろす向きに置く。
 * 外形が閉じているかどうかには関係なく使う（周辺建物は範囲に入れない）。敷地が無ければ null。
 * 三次元の座標: 平面の y は北（−z）、南は +z（sceneSpace.ts）。
 */
export function initialViewOf(lot: readonly Point[] | null, fovDeg: number): SceneFrame | null {
  if (!lot || lot.length === 0) return null
  const frame = sceneFrameOf([lot], fovDeg)
  if (!frame) return null
  const e = (INITIAL_VIEW_ELEVATION_DEG * Math.PI) / 180
  // カメラは目標の南側（+z）・上側にある。方向は単位ベクトル（上 sin e、南 cos e）
  const dir: [number, number, number] = [0, Math.sin(e), Math.cos(e)]
  const d = frame.distanceM
  return {
    ...frame,
    position: [frame.target[0] + dir[0] * d, frame.target[1] + dir[1] * d, frame.target[2] + dir[2] * d],
  }
}
