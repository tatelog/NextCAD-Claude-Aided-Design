// 仕様: 自動作成（P3「柱割り・間取り・縦シャフトを作る」）。目標の戸数（1 階あたり）から、スパン数と建物の寸法を決め、住戸数を確かめる。
// 仕様 1: 中廊下は廊下の両側に住戸が並ぶので、1 スパンあたり 2 戸。目標を満たす最小のスパン数を取る。
// 仕様 2: 片廊下は 1 スパンあたり 1 戸。
// 仕様 3: 建物の寸法（幅・奥行）は、住戸の奥行・廊下の幅・スパンから決まる。奥行はスパン数 × スパン。
// 仕様 4: 作った割り付けを countUnits で数え直し、目標に届かなければ shortfall に不足を返す（届いたと言い切らない）。
// 仕様 5: 縦シャフトの数: 住戸ごとの PS は 1 階の住戸数と同じ。コア脇の EPS・DS は各 1（仮置き）。
// 仕様 6: EV の数は evCount から。停止しない階は unreachable_storeys に返す（buildEvLevels の結果）。
// 仕様 7: 目標が 0 以下や整数でなければエラー。
// 仕様 8: 区画ごとに 4 室の部屋割り（仮置き）を返す。
import { describe, expect, it } from 'vitest'
import { generateAutoPlan } from './autoPlan'

const base = {
  targetPerFloor: 7,
  storeyCount: 5,
  storeyHeightMm: 3000,
  spanMm: 6000,
  unitDepthMm: 6000,
  corridorMm: 1600,
  evCount: 2,
  evStops: [1, 2, 3, 4, 5],
}

describe('generateAutoPlan（自動作成）', () => {
  it('中廊下: 目標 7 戸に対し 4 スパン（8 戸）、不足なし', () => {
    const g = generateAutoPlan({ ...base, layout: '中廊下' })
    expect(g.spans).toBe(4)
    expect(g.unitsPerFloor).toBe(8)
    expect(g.shortfall).toBe(0)
    expect(g.depthMm).toBe(4 * 6000)
    expect(g.widthMm).toBe(2 * 6000 + 1600)
  })

  it('片廊下: 1 スパン 1 戸。目標 5 戸に 5 スパン', () => {
    const g = generateAutoPlan({ ...base, targetPerFloor: 5, layout: '片廊下' })
    expect(g.spans).toBe(5)
    expect(g.unitsPerFloor).toBe(5)
    expect(g.widthMm).toBe(6000 + 1600)
  })

  it('縦シャフト: PS は住戸ごと（1 階の住戸数）、コア脇の EPS・DS は各 1', () => {
    const g = generateAutoPlan({ ...base, layout: '中廊下' })
    expect(g.shafts).toEqual({ ps: 8, eps: 1, ds: 1 })
  })

  it('EV は evCount の数だけ。停止しない階は返す', () => {
    const g = generateAutoPlan({ ...base, layout: '中廊下', evStops: [1, 3, 5] })
    expect(g.ev.ev_cores).toHaveLength(2)
    expect(g.ev.unreachable_storeys).toEqual([2, 4])
  })

  it('目標が 0 以下・整数でなければエラー', () => {
    expect(() => generateAutoPlan({ ...base, targetPerFloor: 0, layout: '中廊下' })).toThrow()
    expect(() => generateAutoPlan({ ...base, targetPerFloor: 2.5, layout: '中廊下' })).toThrow()
  })
})
