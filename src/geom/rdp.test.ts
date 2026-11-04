// 仕様: D-02 C1「直線化の方法」: 直線モードでは折れ線の点列を簡略化して直線にする
// （Ramer–Douglas–Peucker 法、許容誤差は画面上 8 px の仮置き）
import { describe, expect, it } from 'vitest'
import { simplifyRdp } from './rdp'

describe('simplifyRdp', () => {
  it('ほぼ一直線の点列は両端の2点だけになる', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 10, y: 1 },
      { x: 20, y: -1 },
      { x: 30, y: 2 },
      { x: 40, y: 0 },
    ]
    expect(simplifyRdp(pts, 8)).toEqual([
      { x: 0, y: 0 },
      { x: 40, y: 0 },
    ])
  })

  it('許容誤差を超える折れ点は残る（L字）', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 1 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 101, y: 100 },
    ]
    expect(simplifyRdp(pts, 8)).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 101, y: 100 },
    ])
  })

  it('2点以下はそのまま返す', () => {
    expect(simplifyRdp([], 8)).toEqual([])
    expect(simplifyRdp([{ x: 1, y: 1 }], 8)).toEqual([{ x: 1, y: 1 }])
  })

  it('入力の配列を変更しない', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 5, y: 1 },
      { x: 10, y: 0 },
    ]
    const copy = structuredClone(pts)
    simplifyRdp(pts, 8)
    expect(pts).toEqual(copy)
  })
})
