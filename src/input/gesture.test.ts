// 仕様: D-02 C1「入力の取り方」（G23）・「ジェスチャの割り当て」（仮置き）・D-04 キャンバス。
// 1) 指・マウス・ペンを Pointer Events で一つに扱い、入力の種類で挙動を変えない。
// 2) 指 2 本でパンとズーム。マウスはホイールでズーム、中ボタンでパン。ズームしても mm 座標は動かない。
import { describe, expect, it } from 'vitest'
import { applyPinch, classifyPointerDown, pinchStep, wheelZoomFactor } from './gesture'
import { createViewport, mmToPx, pxToMm, type Point } from '../geom/viewport'

const base = { button: 0, shiftKey: false }

describe('入力の取り方: 種類によらず同じ挙動（G23）', () => {
  it.each(['pen', 'touch', 'mouse'] as const)('1 本のポインタ（%s）は描く', (pointerType) => {
    expect(classifyPointerDown({ ...base, pointerType, activeCount: 1 })).toBe('draw')
  })

  it.each(['pen', 'touch', 'mouse'] as const)('2 本目が来たら（%s）パンとズームに切り替わる', (pointerType) => {
    expect(classifyPointerDown({ ...base, pointerType, activeCount: 2 })).toBe('pan-zoom')
  })

  it('ペンと指とマウスで、同じ本数なら結果が同じ（種類で分岐しない）', () => {
    for (const n of [1, 2, 3]) {
      const results = (['pen', 'touch', 'mouse'] as const).map((pointerType) =>
        classifyPointerDown({ ...base, pointerType, activeCount: n }),
      )
      expect(new Set(results).size).toBe(1)
    }
  })

  it('マウスの中ボタンのドラッグはパン', () => {
    expect(classifyPointerDown({ pointerType: 'mouse', button: 1, shiftKey: false, activeCount: 1 })).toBe('pan')
  })

  it('マウスの Shift + ドラッグは描く（仕様のパンは中ボタンだけ。Shift では動かさない）', () => {
    expect(classifyPointerDown({ pointerType: 'mouse', button: 0, shiftKey: true, activeCount: 1 })).toBe('draw')
  })

  it('マウスの右ボタンでは描かない（右クリックはサークルメニュー。G52）', () => {
    expect(classifyPointerDown({ pointerType: 'mouse', button: 2, shiftKey: false, activeCount: 1 })).toBe('none')
  })

  it('中ボタンは指・ペンには効かない（種類で挙動を変えない例外を作らない）', () => {
    expect(classifyPointerDown({ pointerType: 'touch', button: 1, shiftKey: false, activeCount: 1 })).toBe('draw')
    expect(classifyPointerDown({ pointerType: 'pen', button: 1, shiftKey: false, activeCount: 1 })).toBe('draw')
  })
})

describe('パン・ズーム（指 2 本、ホイール）', () => {
  const vp = createViewport({ originPx: { x: 100, y: 500 }, mmPerPx: 20 })

  it('2 本の指を同じだけ動かすとパン（ズームしない）', () => {
    const step = pinchStep([{ x: 100, y: 100 }, { x: 200, y: 100 }], [{ x: 130, y: 140 }, { x: 230, y: 140 }])
    expect(step.panPx).toEqual({ x: 30, y: 40 })
    expect(step.zoomFactor).toBe(1)
  })

  it('2 本の指が離れると拡大、近づくと縮小（距離の比）', () => {
    const apart = pinchStep([{ x: 100, y: 100 }, { x: 200, y: 100 }], [{ x: 50, y: 100 }, { x: 250, y: 100 }])
    expect(apart.zoomFactor).toBeCloseTo(2, 10)
    const near = pinchStep([{ x: 100, y: 100 }, { x: 200, y: 100 }], [{ x: 125, y: 100 }, { x: 175, y: 100 }])
    expect(near.zoomFactor).toBeCloseTo(0.5, 10)
  })

  it('指の距離が 0 のときはズームしない（0 除算を避ける）', () => {
    const step = pinchStep([{ x: 100, y: 100 }, { x: 100, y: 100 }], [{ x: 100, y: 100 }, { x: 120, y: 100 }])
    expect(step.zoomFactor).toBe(1)
  })

  it('ピンチの前後で、指の真ん中の下にある mm の点は真ん中の位置に留まる', () => {
    const prev: [Point, Point] = [{ x: 100, y: 100 }, { x: 200, y: 160 }]
    const next: [Point, Point] = [{ x: 60, y: 120 }, { x: 260, y: 200 }]
    const step = pinchStep(prev, next)
    const after = applyPinch(vp, step)
    const prevMid = { x: 150, y: 130 }
    const nowMid = { x: 160, y: 160 }
    const mmBefore = pxToMm(vp, prevMid)
    const pxAfter = mmToPx(after, mmBefore)
    expect(pxAfter.x).toBeCloseTo(nowMid.x, 6)
    expect(pxAfter.y).toBeCloseTo(nowMid.y, 6)
  })

  it('ホイールは上にスクロールで拡大、下で縮小（既存の倍率を保つ）', () => {
    expect(wheelZoomFactor(-100)).toBeGreaterThan(1)
    expect(wheelZoomFactor(100)).toBeLessThan(1)
    expect(wheelZoomFactor(0)).toBe(1)
  })

  it('mm と px の往復は倍率を変えても戻る（実寸 mm の分離）', () => {
    for (const mmPerPx of [0.5, 5, 50]) {
      const v = createViewport({ originPx: { x: 33, y: 77 }, mmPerPx })
      const p = { x: 12_345, y: -6_789 }
      const back = pxToMm(v, mmToPx(v, p))
      expect(back.x).toBeCloseTo(p.x, 6)
      expect(back.y).toBeCloseTo(p.y, 6)
    }
  })
})
