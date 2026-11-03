// 外形のつまみ（ハブ A-03 G65、D-04 P2）。外形の角（四角）と辺の中点（丸）に置き、つまんで動かして外形を変える。
// 描画にも状態にも依存しない純粋な処理。実寸は mm。当たり判定だけ画面の px。数値は仮置き。
import type { Point } from '../geom/viewport'
import { pickEndpointWithin } from '../input/endpointPick'
import { isSimple } from './placement'

/** つまみの当たり判定の半径（画面の px）。仮置き。 */
export const HANDLE_HIT_RADIUS_PX = 12

export type HandleKind = 'corner' | 'midpoint'
export type HandleShape = 'square' | 'circle'

/**
 * どのつまみか。corner は頂点の番号。
 * midpoint は辺の番号（頂点 index と次の頂点 index + 1 の間。最後の辺は先頭の頂点へ戻る）。
 */
export interface HandleRef {
  readonly kind: HandleKind
  readonly index: number
}

export interface FootprintHandle extends HandleRef {
  readonly id: string
  /** 角は四角、辺の中点は丸 */
  readonly shape: HandleShape
  /** つまみの位置（mm）。辺の中点は 0.5 mm 単位になることがある */
  readonly x: number
  readonly y: number
}

/** 外形（頂点の列）から、角のつまみ、辺の中点のつまみの順に出す。頂点が 3 つ未満なら外形ではないので出さない。 */
export function footprintHandles(footprint: readonly Point[]): FootprintHandle[] {
  const n = footprint.length
  if (n < 3) return []
  const corners: FootprintHandle[] = footprint.map((p, index) => ({
    id: `corner:${index}`,
    kind: 'corner',
    shape: 'square',
    index,
    x: p.x,
    y: p.y,
  }))
  const midpoints: FootprintHandle[] = footprint.map((a, index) => {
    const b = footprint[(index + 1) % n]!
    return { id: `midpoint:${index}`, kind: 'midpoint', shape: 'circle', index, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  })
  return [...corners, ...midpoints]
}

/**
 * ポインタ（mm）が当たるつまみ。中心から 12 px 以内で最も近いもの。なければ null。
 * mmPerPx は 1 px あたりの mm（ビューポートの拡大率）。拡大率が変わっても画面上の 12 px は変わらない。
 */
export function hitTestHandle(handles: readonly FootprintHandle[], pointer: Point, mmPerPx: number): FootprintHandle | null {
  return pickEndpointWithin(handles, pointer, HANDLE_HIT_RADIUS_PX * mmPerPx)
}

export interface HandleDragResult {
  /** 動かした結果が外形として成り立つか。false のときは footprint が動かす前の形 */
  readonly valid: boolean
  readonly footprint: Point[]
}

// -0 は 0 にそろえる（整数 mm に -0 は要らない）
const snapTo = (v: number, step: number): number => Math.round(v / step) * step + 0

// 長さ 0 の辺・面積 0 を除き、自己交差もしない（単純多角形）
function isValidOutline(poly: readonly Point[]): boolean {
  const n = poly.length
  let twiceArea = 0
  for (let i = 0; i < n; i++) {
    const a = poly[i]!
    const b = poly[(i + 1) % n]!
    if (a.x === b.x && a.y === b.y) return false
    twiceArea += a.x * b.y - b.x * a.y
  }
  return twiceArea !== 0 && isSimple(poly)
}

/**
 * つまみを pointer（mm）へ動かした外形。
 * 動かした先は snapMm（入力スナップの段。mm）の格子に吸着する。0 以下・数でないときは 1 mm。
 * 角は、その頂点だけが動く。辺の中点は、その辺の両端が同じだけ動く（中点が半端なときは、動かす量を整数 mm に丸める）。
 * 結果が単純多角形でなければ valid: false で、動かす前の形を返す。入力の外形は書き換えない。
 */
export function dragHandle(footprint: readonly Point[], handle: HandleRef, pointer: Point, snapMm: number): HandleDragResult {
  const original = footprint.map((p) => ({ x: p.x, y: p.y }))
  const n = original.length
  const { kind, index } = handle
  if (n < 3 || !Number.isInteger(index) || index < 0 || index >= n) return { valid: false, footprint: original }

  const step = Number.isFinite(snapMm) && snapMm > 0 ? snapMm : 1
  const target = { x: snapTo(pointer.x, step), y: snapTo(pointer.y, step) }

  const next = original.map((p) => ({ x: p.x, y: p.y }))
  if (kind === 'corner') {
    next[index] = target
  } else {
    const j = (index + 1) % n
    const a = original[index]!
    const b = original[j]!
    const dx = Math.round(target.x - (a.x + b.x) / 2) + 0
    const dy = Math.round(target.y - (a.y + b.y) / 2) + 0
    next[index] = { x: a.x + dx, y: a.y + dy }
    next[j] = { x: b.x + dx, y: b.y + dy }
  }
  return isValidOutline(next) ? { valid: true, footprint: next } : { valid: false, footprint: original }
}
