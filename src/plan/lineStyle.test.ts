// 仕様（ハブ D-04 共通部品「キャンバス」: 画面に出るのは意味が付いた後の見え方）:
// 外形は壁厚の輪郭、通り芯は一点鎖線、柱は断面、壁は二重線、開口は切り欠き、部屋は塗り。意味が変われば描き換わる。
// 仕様 1: 通り芯は一点鎖線（破線の並びが、長い線と短い点の組）。
// 仕様 2: 壁と柱は太い線。外形はそれより細い実線。部屋は細い線（塗りは別の作業）。
// 仕様 3: 開口は切り欠きの代わりに破線（仮置き）。壁は二重線の代わりに太い線（仮置き）。
// 仕様 4: 層の見え方は、層が決めた色と太さと破線だけで決まる（同じ層は同じ見え方）。
import { describe, expect, it } from 'vitest'
import { lineStyleOf, segmentStyle } from './lineStyle'

describe('層ごとの線の見え方（仕様 1〜3）', () => {
  it('通り芯は一点鎖線（破線の並びが 4 つ以上で、実線ではない）', () => {
    const dash = lineStyleOf('通り芯').dash
    expect(dash.length).toBeGreaterThanOrEqual(4)
    expect(dash.some((d) => d === 0)).toBe(false)
  })

  it('壁と柱は太い。外形はそれより細い実線。部屋は細い線', () => {
    expect(lineStyleOf('壁').width).toBeGreaterThan(lineStyleOf('外形').width)
    expect(lineStyleOf('柱').width).toBeGreaterThan(lineStyleOf('外形').width)
    expect(lineStyleOf('外形').dash).toEqual([])
    expect(lineStyleOf('部屋').width).toBeLessThan(lineStyleOf('外形').width)
  })

  it('開口は破線（切り欠きの代わり）', () => {
    expect(lineStyleOf('開口').dash.length).toBeGreaterThan(0)
  })
})

// 仕様 5（要確認の印の見せ方。仮置き）: 要確認の線は、層の見え方のまま、橙色で一段太く描く。確定の線は層の見え方のまま。
describe('要確認の線の見せ方（仕様 5）', () => {
  it('要確認の線は、層の見え方と違う色で、太さは同じか太い', () => {
    const base = lineStyleOf('壁')
    const review = segmentStyle('壁', true)
    expect(review.color).not.toBe(base.color)
    expect(review.width).toBeGreaterThanOrEqual(base.width)
  })

  it('確定の線は、層の見え方のまま', () => {
    expect(segmentStyle('壁', false)).toEqual(lineStyleOf('壁'))
  })
})

describe('同じ層は同じ見え方（仕様 4）', () => {
  it('同じ層を二度たずねると、同じ色・太さ・破線になる', () => {
    expect(lineStyleOf('壁')).toEqual(lineStyleOf('壁'))
    expect(lineStyleOf('通り芯')).toEqual(lineStyleOf('通り芯'))
  })
})
