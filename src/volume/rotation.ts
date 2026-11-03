// ボリューム（建物）の回転（ハブ A-03 G71、D-04 P2）。右パネルの回転角（°）と刻み（自由・15°・90°）。
// 描画にも状態にも依存しない純粋な処理。数値は仮置き。回す処理そのものは canvas/outlineEdit.ts の rotateOutline。
import type { Point } from '../geom/viewport'

/** 回転の刻み。自由は丸めない。 */
export type RotationStep = 'free' | 15 | 90

/** 右パネルの刻みの選択肢（自由・15°・90°）。 */
export const ROTATION_STEPS: readonly RotationStep[] = ['free', 15, 90]

/**
 * 入力された角度（°）を刻みに丸める。15° か 90° は最寄りの倍数に、自由は丸めない。
 * 数でない入力（NaN・無限大）は 0°。-0 は 0 にそろえる。
 */
export function snapAngle(deg: number, step: RotationStep): number {
  if (!Number.isFinite(deg)) return 0
  if (step === 'free') return deg + 0
  return Math.round(deg / step) * step + 0
}

/**
 * 外形の重心（面積の重心）。回転の中心。頂点の回り方によらない。
 * 面積が 0 のとき（一直線に並ぶ）は頂点の平均。頂点が無ければ null。
 */
export function outlineCentroid(poly: readonly Point[]): Point | null {
  const n = poly.length
  if (n === 0) return null
  let twiceArea = 0
  let cx = 0
  let cy = 0
  let sumX = 0
  let sumY = 0
  for (let i = 0; i < n; i++) {
    const a = poly[i]!
    const b = poly[(i + 1) % n]!
    const cross = a.x * b.y - b.x * a.y
    twiceArea += cross
    cx += (a.x + b.x) * cross
    cy += (a.y + b.y) * cross
    sumX += a.x
    sumY += a.y
  }
  if (twiceArea === 0) return { x: sumX / n, y: sumY / n }
  return { x: cx / (3 * twiceArea), y: cy / (3 * twiceArea) }
}

/** 座標を整数 mm に丸める（四捨五入。-0 は 0 にそろえる）。extrudeVolume は整数 mm の外形しか受け付けない。 */
export function roundFootprintMm(poly: readonly Point[]): Point[] {
  return poly.map((p) => ({ x: Math.round(p.x) + 0, y: Math.round(p.y) + 0 }))
}
