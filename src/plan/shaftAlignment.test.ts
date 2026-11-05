// 仕様（統括の決定 G56、2026-11-03。確認 2026-11-05 の項目 6）: 縦シャフト（PS・EPS・DS）は、上下階で位置が一致することを検査する。
// 仕様 1（一致）: 各階の縦シャフトが、同じ id で同じ位置・寸法にあれば一致。並びの順は問わない。
// 仕様 2（不一致）: 位置や寸法が一つでも違う階は、その階の番号（0 始まり）を不一致として返す。
// 仕様 3（欠け）: ある階に、ほかの階にある縦シャフトが無ければ不一致。
// 仕様 4（階が少ない）: 階が 0 か 1 つだけなら、一致とみなす。
import { describe, expect, it } from 'vitest'
import { checkShaftAlignment, type ShaftPlace } from './shaftAlignment'

const ps: ShaftPlace = { id: 'PS-L0', x0: 100, y0: 200, x1: 700, y1: 800 }
const eps: ShaftPlace = { id: 'EPS', x0: 0, y0: 0, x1: 600, y1: 600 }

describe('上下階の縦シャフトの一致（G56）', () => {
  it('同じ位置・寸法なら一致（並びの順は問わない）', () => {
    expect(checkShaftAlignment([[ps, eps], [eps, ps]])).toEqual({ aligned: true, mismatchedFloors: [] })
  })

  it('位置が一つでも違う階は、その階の番号を不一致として返す', () => {
    const moved = { ...ps, x0: 150, x1: 750 }
    expect(checkShaftAlignment([[ps, eps], [ps, eps], [moved, eps]])).toEqual({ aligned: false, mismatchedFloors: [2] })
  })

  it('ある階に、ほかの階にある縦シャフトが無ければ不一致', () => {
    expect(checkShaftAlignment([[ps, eps], [ps]])).toEqual({ aligned: false, mismatchedFloors: [1] })
  })

  it('階が 0 か 1 つだけなら一致とみなす', () => {
    expect(checkShaftAlignment([])).toEqual({ aligned: true, mismatchedFloors: [] })
    expect(checkShaftAlignment([[ps]])).toEqual({ aligned: true, mismatchedFloors: [] })
  })
})
