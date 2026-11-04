// P3 柱割り（D-02 C6、A-03 G5・G17）。等間隔の通り芯と、スパンの許容範囲の判定。
// 割り付けは仮置き（D-02 C6）: 余りは両端に半分ずつ寄せる。既定スパンと許容範囲は呼び出し側が渡す（数値は未決）。
import { z } from 'zod'

const positive = z.number().positive()

// 区間長 L（mm）を既定スパン s（mm）で割り、通り芯の位置（mm）を返す。
export function gridLines(lengthMm: number, spanMm: number): number[] {
  const L = positive.parse(lengthMm)
  const s = positive.parse(spanMm)
  const count = Math.floor(L / s)
  if (count < 1) throw new Error('スパンが区間長より大きい')
  const remainder = L - count * s
  const start = remainder / 2
  return Array.from({ length: count + 1 }, (_, k) => Math.round(start + k * s))
}

// スパンが許容範囲の中なら ok、外なら無理（G17 の「無理な通りの判定」）。
export function checkSpan(spanMm: number, range: { minMm: number; maxMm: number }): 'ok' | '無理' {
  const s = positive.parse(spanMm)
  return s >= range.minMm && s <= range.maxMm ? 'ok' : '無理'
}
