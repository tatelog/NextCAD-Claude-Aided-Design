// 仕様（統括の依頼 2026-11-06。依頼 C。P2 の外形から取った幅・奥行きの中に、住戸を割り付ける）:
// 仕様 18（上書きしない）: 外形の幅・奥行きを渡すと、自動作成はその寸法をそのまま返す（目標の戸数から寸法を決めない）。
// 仕様 19（外形いっぱい）: 住戸は外形の奥行に合わせて並ぶ（中廊下は 1 スパンに 2 戸。スパン数 = 奥行 ÷ スパン の切り捨て）。目標の戸数は、住戸の数を決めない。
// 仕様 20（比べる値）: 外形に入る住戸の数（unitsPerFloor）と目標の差が、不足（shortfall）。目標より多く入っても、不足は 0。
// 仕様 21（奇数の奥行）: 奥行が奇数でも EV ホールを置ける。中央からずれる 1 mm は上側に寄せる。
// 仕様 22（外形が無いとき）: 外形を渡さないときは、今までどおり目標の戸数から寸法を決める。
import { describe, expect, it } from 'vitest'
import { generateAutoPlan } from './autoPlan'

const base = {
  targetPerFloor: 8,
  storeyCount: 5,
  storeyHeightMm: 3000,
  spanMm: 3000,
  unitDepthMm: 6000,
  corridorMm: 1600,
  layout: '中廊下' as const,
  evCount: 2,
  evStops: [1, 2, 3, 4, 5],
}
const outline = { widthMm: 17_202, depthMm: 46_600 }

describe('自動作成は外形の寸法の中に割り付ける（依頼 C）', () => {
  it('仕様 18: 外形の幅・奥行きは上書きしない', () => {
    const g = generateAutoPlan({ ...base, outline })
    expect(g.widthMm).toBe(17_202)
    expect(g.depthMm).toBe(46_600)
  })

  it('仕様 19: 住戸は外形いっぱい（中廊下: スパン数 = 奥行 ÷ スパンの切り捨て、1 スパンに 2 戸）。目標は住戸数を決めない', () => {
    const g = generateAutoPlan({ ...base, outline })
    expect(g.spans).toBe(15)
    expect(g.unitsPerFloor).toBe(30)
  })

  it('仕様 20: 外形に入る数が目標より少なければ不足、多ければ不足は 0', () => {
    const short = generateAutoPlan({ ...base, targetPerFloor: 40, outline })
    expect(short.unitsPerFloor).toBe(30)
    expect(short.shortfall).toBe(10)
    const many = generateAutoPlan({ ...base, targetPerFloor: 8, outline })
    expect(many.unitsPerFloor).toBe(30)
    expect(many.shortfall).toBe(0)
  })

  it('仕様 21: 奥行が奇数でも、EV ホールを置ける（余りの 1 mm は上側）', () => {
    const g = generateAutoPlan({ ...base, outline: { widthMm: 17_202, depthMm: 46_601 } })
    const ev = g.cores.find((c) => c.id === 'evHall')
    expect(ev).toBeDefined()
    expect(Number.isInteger(ev!.y0)).toBe(true)
    expect(ev!.y0 + (ev!.y1 - ev!.y0) / 2).toBeLessThanOrEqual(46_601 / 2 + 1)
  })

  it('仕様 22: 外形を渡さないときは、今までどおり目標から寸法を決める', () => {
    const g = generateAutoPlan({ ...base })
    expect(g.spans).toBe(4)
    expect(g.widthMm).toBe(2 * 6_000 + 1_600)
    expect(g.depthMm).toBe(4 * 3_000)
  })
})
