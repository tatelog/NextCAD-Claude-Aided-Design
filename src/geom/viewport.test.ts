// 仕様: AGENTS.md「実寸 mm 座標と画面 px 座標を分離する。原点・パン・ズームは
// ビューポート変換で管理し、拡大縮小しても既存線分の寸法・座標は不変にする」
// D-02 C1「寸法の保持」: パン・ズームは描画の変換だけを変え、Segment の座標は変えない
import { describe, expect, it } from 'vitest'
import { createViewport, mmToPx, panBy, pxToMm, zoomAt } from './viewport'

describe('viewport: mm と px の変換', () => {
  it('mm → px → mm で元の座標に戻る', () => {
    const vp = createViewport({ originPx: { x: 100, y: 400 }, mmPerPx: 50 })
    const mm = { x: 12_345, y: 6_789 }
    const back = pxToMm(vp, mmToPx(vp, mm))
    expect(back.x).toBeCloseTo(mm.x, 6)
    expect(back.y).toBeCloseTo(mm.y, 6)
  })

  it('原点 mm(0,0) は originPx に写り、mm の +y は画面の上（px の −y）に向く', () => {
    const vp = createViewport({ originPx: { x: 100, y: 400 }, mmPerPx: 10 })
    expect(mmToPx(vp, { x: 0, y: 0 })).toEqual({ x: 100, y: 400 })
    expect(mmToPx(vp, { x: 1000, y: 1000 })).toEqual({ x: 200, y: 300 })
  })

  it('panBy は px の分だけ原点を動かし、mm 座標の点は同じ分だけ画面上で動く', () => {
    const vp = createViewport({ originPx: { x: 0, y: 0 }, mmPerPx: 10 })
    const moved = panBy(vp, { x: 30, y: -20 })
    const before = mmToPx(vp, { x: 500, y: 500 })
    const after = mmToPx(moved, { x: 500, y: 500 })
    expect(after.x - before.x).toBe(30)
    expect(after.y - before.y).toBe(-20)
  })

  it('zoomAt はカーソル直下の mm 点を画面上で動かさない', () => {
    const vp = createViewport({ originPx: { x: 100, y: 100 }, mmPerPx: 10 })
    const cursorPx = { x: 250, y: 180 }
    const under = pxToMm(vp, cursorPx)
    const zoomed = zoomAt(vp, 2, cursorPx)
    const after = mmToPx(zoomed, under)
    expect(after.x).toBeCloseTo(cursorPx.x, 6)
    expect(after.y).toBeCloseTo(cursorPx.y, 6)
    expect(zoomed.mmPerPx).toBeCloseTo(5, 6)
  })

  it('zoomAt は元のビューポートを変更しない（純粋）', () => {
    const vp = createViewport({ originPx: { x: 1, y: 2 }, mmPerPx: 3 })
    zoomAt(vp, 4, { x: 0, y: 0 })
    expect(vp).toEqual(createViewport({ originPx: { x: 1, y: 2 }, mmPerPx: 3 }))
  })
})
