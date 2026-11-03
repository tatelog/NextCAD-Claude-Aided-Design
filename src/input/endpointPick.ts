// 端点の吸着（ハブ D-04 共通部品「端点の吸着」・G37・D-02 C1。数値は仮置き）。
// 描画にも状態にも依存しない純粋な処理。実寸 mm と画面 px の換算は geom/viewport に任せる。
import { mmToPx, pxToMm, type Point, type Viewport } from '../geom/viewport'

/** 端点の吸着半径（画面の px）。仮置き。 */
export const ENDPOINT_SNAP_RADIUS_PX = 24

/** 近づいた端点に出す輪の半径（画面の px）。仮置き。 */
export const ENDPOINT_RING_RADIUS_PX = 10

export interface PointMm {
  readonly x: number
  readonly y: number
}

/** ID を持つ端点（実寸 mm）。 */
export interface EndpointLike<Id = string> extends PointMm {
  readonly id: Id
}

/** 始点・終点として置く場所と、その端点 ID。 */
export interface PlacedEndpoint<Id = string> extends PointMm {
  readonly endpointId: Id
  /** true なら新しい端点（ID を新たに割り当てた）。false なら既存の端点に吸着して ID を共有した。 */
  readonly isNew: boolean
}

const distanceSquared = (a: PointMm, b: PointMm): number => {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

/**
 * 半径（mm）以内で最も近い端点。なければ null。ちょうど半径の距離は含む。
 * 吸着半径をすでに mm に換算して持っている側（snapPoint）が、同じ規則で端点を選ぶために使う。
 */
export function pickEndpointWithin<E extends EndpointLike<unknown>>(
  endpoints: readonly E[],
  point: PointMm,
  radiusMm: number,
): E | null {
  const radiusSquared = radiusMm * radiusMm
  let best: E | null = null
  let bestSquared = Infinity
  for (const endpoint of endpoints) {
    const d = distanceSquared(endpoint, point)
    if (d <= radiusSquared && d < bestSquared) {
      best = endpoint
      bestSquared = d
    }
  }
  return best
}

/** 24 px 以内で最も近い端点。なければ null。mmPerPx は 1 px あたりの mm。 */
export function pickEndpoint<E extends EndpointLike<unknown>>(
  endpoints: readonly E[],
  point: PointMm,
  mmPerPx: number,
): E | null {
  return pickEndpointWithin(endpoints, point, ENDPOINT_SNAP_RADIUS_PX * mmPerPx)
}

/** ポインタが 24 px 以内に近づいた端点だけ。輪で示す対象（近い順）。 */
export function endpointsToRing<E extends EndpointLike<unknown>>(
  endpoints: readonly E[],
  point: PointMm,
  mmPerPx: number,
): E[] {
  const radiusMm = ENDPOINT_SNAP_RADIUS_PX * mmPerPx
  const radiusSquared = radiusMm * radiusMm
  return endpoints
    .map((endpoint) => ({ endpoint, d: distanceSquared(endpoint, point) }))
    .filter(({ d }) => d <= radiusSquared)
    .sort((a, b) => a.d - b.d)
    .map(({ endpoint }) => endpoint)
}

/**
 * 始点（と終点）を置く。24 px 以内に端点があれば、その端点の座標に吸着して ID を共有する（新しい ID は割り当てない）。
 * なければ与えた座標のまま、newId で新しい端点 ID を割り当てる。
 */
export function resolveEndpoint<Id>(
  endpoints: readonly EndpointLike<Id>[],
  point: PointMm,
  mmPerPx: number,
  newId: () => Id,
): PlacedEndpoint<Id> {
  const hit = pickEndpoint(endpoints, point, mmPerPx)
  if (hit) return { x: hit.x, y: hit.y, endpointId: hit.id, isNew: false }
  return { x: point.x, y: point.y, endpointId: newId(), isNew: true }
}

/** 輪を描く位置（画面 px）。ポインタ（画面 px）が 24 px 以内に近づいた端点の画面位置だけ。 */
export function ringCentersPx(endpoints: readonly EndpointLike<unknown>[], pointerPx: Point, vp: Viewport): Point[] {
  return endpointsToRing(endpoints, pxToMm(vp, pointerPx), vp.mmPerPx).map((endpoint) => mmToPx(vp, endpoint))
}

/**
 * 押したときの軌跡の始点（画面 px）。24 px 以内に端点があればその端点の画面位置から描き始める。
 * なければ押した位置のまま。
 */
export function strokeStartPx(endpoints: readonly EndpointLike<unknown>[], pointerPx: Point, vp: Viewport): Point {
  const hit = pickEndpoint(endpoints, pxToMm(vp, pointerPx), vp.mmPerPx)
  return hit ? mmToPx(vp, hit) : pointerPx
}
