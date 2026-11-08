// 仕様（ハブ A-03 G138・G83・G84。統括の依頼 2026-11-05）: EV ホールの奥行と縦シャフトの寸法は、差し替えられるブロックから出す。
// 当面は仮置き（出典なし）。ロジックは後で作り、差し替えるときは、このブロックの中身だけを変える。
// 仕様 1: EV ホールの奥行は、当面 3,000 mm（仮置き）。
// 仕様 2: 縦シャフト（PS・EPS・DS）の寸法は、当面 600 mm（仮置き）。
// 仕様 3: MEP の検討結果を手で入れたときは、その値を使う。
import { describe, expect, it } from 'vitest'
import { evHallLenMm, shaftSizeMm } from './coreDims'

describe('コアと縦シャフトの寸法（G138）', () => {
  it('仕様 1: EV ホールの奥行は当面 3,000 mm（仮置き）', () => {
    expect(evHallLenMm()).toBe(3000)
  })

  it('仕様 2: 縦シャフトは PS・EPS・DS とも当面 600 mm（仮置き）', () => {
    expect(shaftSizeMm('PS')).toBe(600)
    expect(shaftSizeMm('EPS')).toBe(600)
    expect(shaftSizeMm('DS')).toBe(600)
  })

  it('仕様 3: 手で入れた値があれば、それを使う', () => {
    expect(shaftSizeMm('PS', 800)).toBe(800)
  })
})
