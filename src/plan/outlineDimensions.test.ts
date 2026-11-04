// 仕様（ハブ D-04 P3。仮置き）: P3 の幅と奥行きを、P2 で描いた外形（閉じた輪郭）から取る。取れるのは矩形の外形だけ。
// 仕様 1（矩形）: 角（辺の向きが変わる頂点）が 4 つで、どの辺も x 軸か y 軸に平行なら矩形。
//   幅 = 角の x の最大 − 最小、奥行 = 角の y の最大 − 最小（mm の整数）。
//   外形の左下（角の最小の x と y）も返す。P3 の平面を外形の位置に重ねる原点で、今回は使わない（3D の対応の準備）。
// 仕様 2（閉じる点）: 最後の点が最初の点と同じ重複の 5 点も、4 点と同じ結果にする。
// 仕様 3（向きと始まり）: 時計回りでも反時計回りでも、どの角から始まっても、同じ結果にする。
// 仕様 4（矩形でない）: 矩形でなければ null。L 字（6 点）、軸に平行でない辺（45° 回した矩形）、点が 3 つ以下。
//   辺が軸に平行かは、既定では完全に確かめる（許容差なし）。許容差は第 2 引数で渡せる（仕様 9）。
// 仕様 5（面積のない形）: 4 点でも、辺の長さが 0 の形や、行って戻るだけの形（面積 0）は矩形にしない（仮置きの読み）。
// 仕様 6（整数 mm）: 座標に小数があれば、幅と奥行きは四捨五入した整数 mm にする。
// 仕様 7（入力を変えない）: 渡した点の列は書き換えない。
// 仕様 8（P2 の外形）: P2 の線分から作った閉じた外形（findClosedOutline の結果）を、そのまま渡せる。
// 仕様 9（平行の許容差・仮置きの読み）: 第 2 引数の許容差（度。省くと 0）以内の傾きの辺は、軸に平行とみなす。ボタンは P2 が軸に揃える角度
//   （DRAW_OPTIONS.axisSnapDeg）を渡す。理由は仕様 10。幅・奥行きは許容差があっても x と y の最大 − 最小。
//   許容差が負・45 度以上・数でないときは RangeError。許容差があっても、長さ 0 の辺や行って戻る形は矩形にしない。
// 仕様 10（手描きの外形）: P2 で手で閉じた外形は、辺の途中に頂点が残り（線の簡略化の分割点）、最後の辺は端点への吸着（軸への吸着より先）で
//   少し斜めに残る。そのままでは矩形に見えないので、P2 と同じ許容差で、描いた大きさに近い幅と奥行きが取れる。
// 仕様 11（辺の途中の頂点・仮置きの読み）: 同じ向きの辺が続く所の頂点（辺の途中の頂点）は、角に数えない。頂点が 5 つ以上でも、角が 4 つなら矩形。
//   どの頂点から始まっても同じ結果。行って戻るだけで幅か奥行きが 0 になる形は矩形にしない。
// 仕様 12（自分と重なる形）: 角が 4 つでも、辺が別の辺の上に乗る・交わる形（行って戻る線を含む）は矩形にしない。
import { beforeEach, describe, expect, it } from 'vitest'
import { findClosedOutline } from '../canvas/closure'
import type { Point } from '../geom/viewport'
import type { Segment, Stroke } from '../model/schema'
import { DRAW_OPTIONS, useDrawing } from '../store/drawing'
import { outlineDimensions } from './outlineDimensions'

const p = (x: number, y: number): Point => ({ x, y })
/** 左下 (x0, y0)・右上 (x1, y1) の矩形の 4 点（左下から反時計回り） */
const rect = (x0: number, y0: number, x1: number, y1: number): Point[] => [p(x0, y0), p(x1, y0), p(x1, y1), p(x0, y1)]

/** 回る向き（2 通り）× 始まりの点（点の数だけ）の並び。4 点なら 8 通り、5 点なら 10 通り */
const variantsOf = (pts: readonly Point[]): Point[][] => {
  const out: Point[][] = []
  for (const ring of [[...pts], [...pts].reverse()]) {
    for (let k = 0; k < ring.length; k++) out.push([...ring.slice(k), ...ring.slice(0, k)])
  }
  return out
}

describe('矩形の外形から幅と奥行きと左下を取る（仕様 1）', () => {
  it('20000 × 12000 の矩形（原点から）は、幅 20000・奥行 12000・左下 (0, 0)', () => {
    expect(outlineDimensions(rect(0, 0, 20000, 12000))).toEqual({ widthMm: 20000, depthMm: 12000, minX: 0, minY: 0 })
  })

  it('原点がずれた矩形は、幅と奥行きは同じで、左下がずれる', () => {
    expect(outlineDimensions(rect(3000, 5000, 23000, 17000))).toEqual({ widthMm: 20000, depthMm: 12000, minX: 3000, minY: 5000 })
  })

  it('座標が負の矩形でも、左下は最小の x と y', () => {
    expect(outlineDimensions(rect(-5000, -2000, 15000, 10000))).toEqual({ widthMm: 20000, depthMm: 12000, minX: -5000, minY: -2000 })
  })

  it('奥行きの方が長い矩形でも、幅は x の広がり、奥行きは y の広がり', () => {
    expect(outlineDimensions(rect(1000, 2000, 9000, 32000))).toEqual({ widthMm: 8000, depthMm: 30000, minX: 1000, minY: 2000 })
  })
})

describe('点の並び（仕様 2・3）', () => {
  const base = rect(3000, 5000, 23000, 17000)
  const expected = { widthMm: 20000, depthMm: 12000, minX: 3000, minY: 5000 }

  it('回る向きと始まりの角が違っても、同じ結果（8 通り）', () => {
    variantsOf(base).forEach((pts, i) => {
      expect(outlineDimensions(pts), `並び ${i}`).toEqual(expected)
    })
  })

  it('最後の点が最初の点と同じ（閉じるための重複）5 点は、4 点と同じ結果', () => {
    expect(outlineDimensions([...base, base[0]!])).toEqual(expected)
  })

  it('閉じる点つきの 5 点も、回る向きと始まりの角が違っても同じ結果（8 通り）', () => {
    variantsOf(base).forEach((pts, i) => {
      expect(outlineDimensions([...pts, pts[0]!]), `並び ${i}（閉じる点つき）`).toEqual(expected)
    })
  })
})

describe('矩形でないものは null（仕様 4）', () => {
  it('L 字（6 点）は null。閉じる点をつけた 7 点も null', () => {
    const l = [p(0, 0), p(20000, 0), p(20000, 6000), p(8000, 6000), p(8000, 12000), p(0, 12000)]
    expect(outlineDimensions(l)).toBeNull()
    expect(outlineDimensions([...l, l[0]!])).toBeNull()
  })

  it('45° 回した正方形（ひし形）は null', () => {
    expect(outlineDimensions([p(10000, 0), p(20000, 10000), p(10000, 20000), p(0, 10000)])).toBeNull()
  })

  it('45° 回した 20000 × 12000 の長方形（整数 mm に丸めた 4 隅）は null', () => {
    expect(outlineDimensions([p(0, 0), p(14142, 14142), p(5657, 22627), p(-8485, 8485)])).toBeNull()
  })

  it('1 辺がわずかに傾いた四角（右端が 1 mm 上がっている）は、軸に平行でない辺があるので null', () => {
    expect(outlineDimensions([p(0, 0), p(20000, 1), p(20000, 12000), p(0, 12000)])).toBeNull()
  })

  it('点が 3 つ以下（0・1・2・3 点）は null', () => {
    const cases: Point[][] = [[], [p(0, 0)], [p(0, 0), p(20000, 0)], [p(0, 0), p(20000, 0), p(20000, 12000)]]
    for (const pts of cases) {
      expect(outlineDimensions(pts), `${pts.length} 点`).toBeNull()
    }
  })

  it('三角形に閉じる点をつけた 4 点（最後が最初と同じ）は null', () => {
    expect(outlineDimensions([p(0, 0), p(20000, 0), p(20000, 12000), p(0, 0)])).toBeNull()
  })
})

describe('辺の途中の頂点は角に数えない（仕様 11）', () => {
  it('辺の途中に頂点が 1 つある 5 点（最後が最初と違う）は、4 点の矩形と同じ結果', () => {
    expect(outlineDimensions([p(0, 0), p(10000, 0), p(20000, 0), p(20000, 12000), p(0, 12000)])).toEqual({
      widthMm: 20000,
      depthMm: 12000,
      minX: 0,
      minY: 0,
    })
  })

  it('どの頂点から始まっても、回る向きが逆でも、閉じる点をつけても同じ結果（辺の途中の頂点が 1 つの 5 点）', () => {
    const base = [p(3000, 5000), p(13000, 5000), p(23000, 5000), p(23000, 17000), p(3000, 17000)]
    const expected = { widthMm: 20000, depthMm: 12000, minX: 3000, minY: 5000 }
    variantsOf(base).forEach((pts, i) => {
      expect(outlineDimensions(pts), `並び ${i}`).toEqual(expected)
      expect(outlineDimensions([...pts, pts[0]!]), `並び ${i}（閉じる点つき）`).toEqual(expected)
    })
  })

  it('4 つの辺すべての途中に頂点があっても（8 点）、同じ結果', () => {
    const pts = [p(0, 0), p(10000, 0), p(20000, 0), p(20000, 6000), p(20000, 12000), p(10000, 12000), p(0, 12000), p(0, 6000)]
    expect(outlineDimensions(pts)).toEqual({ widthMm: 20000, depthMm: 12000, minX: 0, minY: 0 })
  })

  it('辺の途中の頂点があっても、角が 4 つでなければ null（途中の頂点つきの L 字）', () => {
    const l = [p(0, 0), p(10000, 0), p(20000, 0), p(20000, 6000), p(8000, 6000), p(8000, 12000), p(0, 12000)]
    expect(outlineDimensions(l)).toBeNull()
  })

  it('行って戻るだけで幅が 0 になる形（角は 4 つ）は null', () => {
    const flat = [p(0, 0), p(5000, 0), p(0, 0), p(0, 12000), p(5000, 12000), p(0, 12000)]
    expect(outlineDimensions(flat)).toBeNull()
  })
})

describe('面積のない形は矩形にしない（仕様 5）', () => {
  it('4 点とも同じ位置は null', () => {
    expect(outlineDimensions([p(0, 0), p(0, 0), p(0, 0), p(0, 0)])).toBeNull()
  })

  it('一直線に並ぶ 4 点（奥行き 0）は null', () => {
    expect(outlineDimensions([p(0, 0), p(20000, 0), p(10000, 0), p(5000, 0)])).toBeNull()
  })

  it('同じ位置の点が続く（辺の長さが 0 の）形は null', () => {
    expect(outlineDimensions([p(0, 0), p(20000, 0), p(20000, 0), p(0, 0)])).toBeNull()
  })

  it('T 字になぞった形（行って戻るだけで面積 0）は null', () => {
    expect(outlineDimensions([p(0, 0), p(20000, 0), p(20000, 12000), p(20000, 0)])).toBeNull()
  })
})

describe('整数 mm（仕様 6）', () => {
  it('座標に小数があれば、幅と奥行きは四捨五入した整数 mm', () => {
    // 幅 19999.8 → 20000、奥行 12000.4 → 12000
    const r = outlineDimensions(rect(100.2, 0, 20100, 12000.4))
    expect(r?.widthMm).toBe(20000)
    expect(r?.depthMm).toBe(12000)
  })
})

describe('入力を変えない（仕様 7）', () => {
  it('凍結した点の列（閉じる点つき）を渡しても動き、列は変わらない', () => {
    const pts = Object.freeze([...rect(0, 0, 20000, 12000), p(0, 0)].map((q) => Object.freeze(q)))
    const before = JSON.stringify(pts)
    expect(outlineDimensions(pts)).toEqual({ widthMm: 20000, depthMm: 12000, minX: 0, minY: 0 })
    expect(JSON.stringify(pts)).toBe(before)
  })
})

describe('P2 の線分から作った外形（仕様 8）', () => {
  const seg = (id: string, a: [number, number, string], b: [number, number, string]): Segment => ({
    id,
    x1: a[0],
    y1: a[1],
    x2: b[0],
    y2: b[1],
    start_node_id: a[2],
    end_node_id: b[2],
    snap: 'none',
    stage: 'F4',
    revision: 1,
    curve: 'line',
  })
  /** P2 と同じ手順: 線分から閉じた外形（頂点を順にたどった点の列）を作る */
  const footprintOf = (segments: Segment[]): Point[] => {
    const c = findClosedOutline(segments)
    if (!c.closed) throw new Error(`外形が閉じていない（${c.reason}）`)
    return c.footprint
  }

  it('端点を共有する 4 本の線分で閉じた矩形から、幅と奥行きが取れる', () => {
    const f = footprintOf([
      seg('a', [0, 0, 'n1'], [20000, 0, 'n2']),
      seg('b', [20000, 0, 'n2'], [20000, 12000, 'n3']),
      seg('c', [20000, 12000, 'n3'], [0, 12000, 'n4']),
      seg('d', [0, 12000, 'n4'], [0, 0, 'n1']),
    ])
    expect(outlineDimensions(f)).toEqual({ widthMm: 20000, depthMm: 12000, minX: 0, minY: 0 })
  })

  it('線分の並びと向きがばらばらでも、同じ幅と奥行きと左下が取れる', () => {
    const f = footprintOf([
      seg('d', [3000, 5000, 'n1'], [3000, 17000, 'n4']),
      seg('b', [23000, 5000, 'n2'], [23000, 17000, 'n3']),
      seg('c', [23000, 17000, 'n3'], [3000, 17000, 'n4']),
      seg('a', [3000, 5000, 'n1'], [23000, 5000, 'n2']),
    ])
    expect(outlineDimensions(f)).toEqual({ widthMm: 20000, depthMm: 12000, minX: 3000, minY: 5000 })
  })

  it('L 字に閉じた外形（6 本）は、閉じているが矩形ではないので null', () => {
    const f = footprintOf([
      seg('a', [0, 0, 'n1'], [20000, 0, 'n2']),
      seg('b', [20000, 0, 'n2'], [20000, 6000, 'n3']),
      seg('c', [20000, 6000, 'n3'], [8000, 6000, 'n4']),
      seg('d', [8000, 6000, 'n4'], [8000, 12000, 'n5']),
      seg('e', [8000, 12000, 'n5'], [0, 12000, 'n6']),
      seg('f', [0, 12000, 'n6'], [0, 0, 'n1']),
    ])
    expect(outlineDimensions(f)).toBeNull()
  })
})

describe('平行の許容差（第 2 引数。度。仕様 9）', () => {
  // 最後の辺（右下から原点へ）が、20000 mm で 100 mm（約 0.3°）傾いた四角。ほかの 3 辺は完全に軸に平行
  const slightlySlanted = [p(0, 0), p(0, 12000), p(20000, 12000), p(20000, -100)]

  it('許容差 3° なら、最後の辺が約 0.3° 傾いた四角は矩形。幅と奥行きは x と y の最大 − 最小', () => {
    expect(outlineDimensions(slightlySlanted, 3)).toEqual({ widthMm: 20000, depthMm: 12100, minX: 0, minY: -100 })
  })

  it('許容差を省く（または 0）と、同じ四角は完全に平行な辺だけを数えるので null', () => {
    expect(outlineDimensions(slightlySlanted)).toBeNull()
    expect(outlineDimensions(slightlySlanted, 0)).toBeNull()
  })

  it('許容差 3° でも、約 5.7° 傾いた辺がある四角は null', () => {
    expect(outlineDimensions([p(0, 0), p(0, 12000), p(20000, 12000), p(20000, -2000)], 3)).toBeNull()
  })

  it('許容差 3° でも、45° 回した矩形は null', () => {
    expect(outlineDimensions([p(10000, 0), p(20000, 10000), p(10000, 20000), p(0, 10000)], 3)).toBeNull()
    expect(outlineDimensions([p(0, 0), p(14142, 14142), p(5657, 22627), p(-8485, 8485)], 3)).toBeNull()
  })

  it('許容差があっても、完全に平行な矩形と、閉じる点つきの 5 点は同じ結果', () => {
    expect(outlineDimensions(rect(3000, 5000, 23000, 17000), 3)).toEqual({ widthMm: 20000, depthMm: 12000, minX: 3000, minY: 5000 })
    expect(outlineDimensions([...rect(0, 0, 20000, 12000), p(0, 0)], 3)).toEqual({ widthMm: 20000, depthMm: 12000, minX: 0, minY: 0 })
  })

  it('許容差があっても、長さ 0 の辺・行って戻る形・一直線の 4 点・L 字は矩形にしない', () => {
    const cases: Point[][] = [
      [p(0, 0), p(20000, 0), p(20000, 0), p(0, 0)],
      [p(0, 0), p(20000, 0), p(20000, 12000), p(20000, 0)],
      [p(0, 0), p(20000, 0), p(10000, 0), p(5000, 0)],
      [p(0, 0), p(20000, 0), p(20000, 6000), p(8000, 6000), p(8000, 12000), p(0, 12000)],
    ]
    cases.forEach((pts, i) => {
      expect(outlineDimensions(pts, 3), `形 ${i}`).toBeNull()
    })
  })

  it('許容差が負・45° 以上・数でないときは RangeError', () => {
    for (const bad of [-1, 45, 90, Number.NaN]) {
      expect(() => outlineDimensions(rect(0, 0, 20000, 12000), bad), `許容差 ${bad}`).toThrow(RangeError)
    }
  })
})

describe('P2 で手描きした外形（実際の描画の手順。仕様 10）', () => {
  // 1 px = 50 mm。画面の y は下向きで、mm の y は上向き（描画の換算が反転する）
  let seq = 0
  const stroke = (points: [number, number][]): Stroke => ({
    id: `outline-st-${seq++}`,
    points: points.map(([px, py]) => ({ px, py })),
    view_scale: 50,
    view_origin: { px: 0, py: 0 },
    stage: 'F5',
    pen_mode: 'line',
    created_at: '2026-11-04T00:00:00.000Z',
    pen_input: 'mouse',
  })
  // 手で 1 本のストロークで描いた、20000 × 12000 mm（400 × 240 px）をねらった矩形。角が数 px ずれ、最後は始点の近くで止める
  const handDrawn: [number, number][] = [
    [100, 400],
    [101, 280],
    [102, 160],
    [300, 158],
    [498, 159],
    [500, 280],
    [501, 402],
    [300, 401],
    [103, 398],
  ]
  // 同じ矩形を、4 本の線に分けて描いたもの
  const fourSides: [number, number][][] = [
    [[100, 400], [102, 160]],
    [[102, 160], [498, 159]],
    [[498, 159], [501, 402]],
    [[501, 402], [103, 398]],
  ]
  /** 店舗（P2 の線分）から、閉じた外形の点の列を取る。P3 のボタンと同じ手順 */
  const storeFootprint = (): Point[] => {
    const c = findClosedOutline(useDrawing.getState().entries.flatMap((e) => e.segments))
    if (!c.closed) throw new Error(`手描きの外形が閉じていない（${c.reason}）`)
    return c.footprint
  }
  /** ねらった 20000 × 12000 mm から 300 mm（6 px）以内 */
  const expectNearIntended = (r: ReturnType<typeof outlineDimensions>) => {
    expect(r).not.toBeNull()
    expect(Math.abs(r!.widthMm - 20000)).toBeLessThanOrEqual(300)
    expect(Math.abs(r!.depthMm - 12000)).toBeLessThanOrEqual(300)
  }

  beforeEach(() => {
    useDrawing.setState({ entries: [], past: [], redoStack: [], fitted: false })
  })

  it('（前提）1 本の線で閉じた外形は、辺の途中に頂点が残り、最後の辺が端点への吸着で少し斜めに残るので、許容差なしでは矩形に見えない', () => {
    useDrawing.getState().addStroke(stroke(handDrawn))
    const f = storeFootprint()
    expect(f.length).toBeGreaterThan(4)
    expect(outlineDimensions(f)).toBeNull()
  })

  it('1 本の線で描いた矩形は、P2 の軸への吸着と同じ許容差（DRAW_OPTIONS.axisSnapDeg）なら、描いた大きさに近い幅と奥行きが取れる', () => {
    useDrawing.getState().addStroke(stroke(handDrawn))
    expectNearIntended(outlineDimensions(storeFootprint(), DRAW_OPTIONS.axisSnapDeg))
  })

  it('4 本の線に分けて描いた矩形は 4 点で閉じるが、最後の辺が少し斜めに残る。同じ許容差なら幅と奥行きが取れる', () => {
    for (const side of fourSides) useDrawing.getState().addStroke(stroke(side))
    const f = storeFootprint()
    expect(f).toHaveLength(4)
    expect(outlineDimensions(f)).toBeNull()
    expectNearIntended(outlineDimensions(f, DRAW_OPTIONS.axisSnapDeg))
  })
})

describe('自分と重なる形は矩形にしない（仕様 12）', () => {
  // 下の辺の上に、右の頂点から左へ戻る線が乗る。角は 4 つ（(0,0)・(10000,0)・(10000,12000)・(0,12000)）で、軸に平行な辺だけ
  const spike = [p(0, 0), p(20000, 0), p(10000, 0), p(10000, 12000), p(0, 12000)]

  it('角が 4 つでも、辺が別の辺の上に乗る形（行って戻る線を含む）は null', () => {
    expect(outlineDimensions(spike)).toBeNull()
  })

  it('回る向きや始まりが違っても、閉じる点をつけても null（10 通り）', () => {
    variantsOf(spike).forEach((pts, i) => {
      expect(outlineDimensions(pts), `並び ${i}`).toBeNull()
      expect(outlineDimensions([...pts, pts[0]!]), `並び ${i}（閉じる点つき）`).toBeNull()
    })
  })
})
