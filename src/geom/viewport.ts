// 実寸 mm と画面 px の変換。原点・パン・ズームはここだけが持ち、Segment の座標は触らない。
// mm の +y は画面の上向き（px の −y）。

export interface Point {
  readonly x: number
  readonly y: number
}

export interface Viewport {
  /** mm の原点 (0,0) が写る画面 px */
  readonly originPx: Point
  /** 1 px あたりの mm */
  readonly mmPerPx: number
}

export function createViewport(init: { originPx: Point; mmPerPx: number }): Viewport {
  return { originPx: { x: init.originPx.x, y: init.originPx.y }, mmPerPx: init.mmPerPx }
}

export function mmToPx(vp: Viewport, p: Point): Point {
  return { x: vp.originPx.x + p.x / vp.mmPerPx, y: vp.originPx.y - p.y / vp.mmPerPx }
}

export function pxToMm(vp: Viewport, p: Point): Point {
  return { x: (p.x - vp.originPx.x) * vp.mmPerPx, y: -(p.y - vp.originPx.y) * vp.mmPerPx }
}

export function panBy(vp: Viewport, deltaPx: Point): Viewport {
  return { originPx: { x: vp.originPx.x + deltaPx.x, y: vp.originPx.y + deltaPx.y }, mmPerPx: vp.mmPerPx }
}

/** factor > 1 で拡大。centerPx の直下にある mm の点は画面上で動かない。 */
export function zoomAt(vp: Viewport, factor: number, centerPx: Point): Viewport {
  const under = pxToMm(vp, centerPx)
  const mmPerPx = vp.mmPerPx / factor
  return {
    originPx: { x: centerPx.x - under.x / mmPerPx, y: centerPx.y + under.y / mmPerPx },
    mmPerPx,
  }
}
