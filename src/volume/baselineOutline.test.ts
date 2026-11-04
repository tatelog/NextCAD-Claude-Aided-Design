// 仕様（ハブ A-03 G59・G4。統括の依頼 t52「P2 の外形の基準線を選べるようにする」、2026-11-04）:
// 仕様 1（既定）: 基準線は外壁の中心線（描いた外形）。ずらし 0 で中心線を選ぶと、外形はそのまま。
// 仕様 2（内側）: 内側を選ぶと、中心線から壁厚の半分だけ内へ寄せた線（G4「壁厚は中心から両側にオフセット」と揃える）。
// 仕様 3（量）: 中心線からの量（mm。外へ正・内へ負）で動かせる。内側とずらしの量は足す。
// 仕様 4（角）: 頂点の数は変わらず、凹んだ角（L 字）も内へ寄せて形が崩れない。
// 仕様 5（消える）: 内へずらして外形が消えるときは、理由を返す（黙って消さない）。
// 仕様 6（向き）: 頂点の順（時計回り・反時計回り）によらず、同じ線になる。
// 仕様 7（整数）: 結果は整数 mm（立体の入力に使えるように）。
import { describe, expect, it } from 'vitest'
import { baselineDistanceOf, baselineOutline, DEFAULT_WALL_THICKNESS_MM, type BaselineOptions } from './baselineOutline'

const RECT = [
  { x: 0, y: 0 },
  { x: 10000, y: 0 },
  { x: 10000, y: 10000 },
  { x: 0, y: 10000 },
]
const SMALL = [
  { x: 0, y: 0 },
  { x: 1000, y: 0 },
  { x: 1000, y: 1000 },
  { x: 0, y: 1000 },
]
const L_SHAPE = [
  { x: 0, y: 0 },
  { x: 10000, y: 0 },
  { x: 10000, y: 5000 },
  { x: 5000, y: 5000 },
  { x: 5000, y: 10000 },
  { x: 0, y: 10000 },
]

const opts = (side: BaselineOptions['side'], offsetMm = 0): BaselineOptions => ({
  side,
  offsetMm,
  wallThicknessMm: DEFAULT_WALL_THICKNESS_MM,
})

describe('基準線の量（仕様 1〜3）', () => {
  it('中心線でずらし 0 なら、量は 0（既定）', () => {
    expect(baselineDistanceOf(opts('中心線'))).toBe(0)
  })

  it('内側は壁厚の半分だけ内へ（200 mm の壁なら -100）', () => {
    expect(baselineDistanceOf(opts('内側'))).toBe(-100)
  })

  it('内側に、ずらしの量を足す（内側 + 30 mm は -70）', () => {
    expect(baselineDistanceOf(opts('内側', 30))).toBe(-70)
  })

  it('中心線からのずらしは、外へ正（+50 は外へ 50 mm）', () => {
    expect(baselineDistanceOf(opts('中心線', 50))).toBe(50)
  })
})

describe('基準線の外形', () => {
  it('既定（中心線・ずらし 0）は、描いた外形そのまま', () => {
    expect(baselineOutline(RECT, opts('中心線'))).toEqual({ ok: true, footprint: RECT })
  })

  it('内側は、各辺を壁厚の半分（100 mm）だけ内へ寄せた線', () => {
    expect(baselineOutline(RECT, opts('内側'))).toEqual({
      ok: true,
      footprint: [
        { x: 100, y: 100 },
        { x: 9900, y: 100 },
        { x: 9900, y: 9900 },
        { x: 100, y: 9900 },
      ],
    })
  })

  it('中心線から外へ 50 mm（ずらし +50）', () => {
    expect(baselineOutline(RECT, opts('中心線', 50))).toEqual({
      ok: true,
      footprint: [
        { x: -50, y: -50 },
        { x: 10050, y: -50 },
        { x: 10050, y: 10050 },
        { x: -50, y: 10050 },
      ],
    })
  })

  it('内側から、さらに外へ 50 mm（内側・ずらし +50 は内へ 50 mm）', () => {
    expect(baselineOutline(RECT, opts('内側', 50))).toEqual({
      ok: true,
      footprint: [
        { x: 50, y: 50 },
        { x: 9950, y: 50 },
        { x: 9950, y: 9950 },
        { x: 50, y: 9950 },
      ],
    })
  })

  it('凹んだ角（L 字）は、頂点の数を保ち、内へ寄せても形が崩れない', () => {
    expect(baselineOutline(L_SHAPE, opts('内側'))).toEqual({
      ok: true,
      footprint: [
        { x: 100, y: 100 },
        { x: 9900, y: 100 },
        { x: 9900, y: 4900 },
        { x: 4900, y: 4900 },
        { x: 4900, y: 9900 },
        { x: 100, y: 9900 },
      ],
    })
  })

  it('頂点の順が時計回りでも、同じ線になる', () => {
    const reversed = [...RECT].reverse()
    const result = baselineOutline(reversed, opts('内側'))
    if (!result.ok) throw new Error('外形が消えた')
    const expected = baselineOutline(RECT, opts('内側'))
    if (!expected.ok) throw new Error('基準の外形が消えた')
    const keyOf = (p: { x: number; y: number }) => `${p.x},${p.y}`
    expect(result.footprint.map(keyOf).sort()).toEqual(expected.footprint.map(keyOf).sort())
  })

  it('結果は整数 mm', () => {
    const result = baselineOutline(RECT, opts('中心線', 33))
    if (!result.ok) throw new Error('外形が消えた')
    for (const p of result.footprint) {
      expect(Number.isInteger(p.x)).toBe(true)
      expect(Number.isInteger(p.y)).toBe(true)
    }
  })

  it('内へずらして外形が消えるときは、理由を返す（黙って消さない）', () => {
    const result = baselineOutline(SMALL, opts('内側', -600))
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('消えるはずの外形が残った')
    expect(result.reason.length).toBeGreaterThan(0)
  })
})
