// 仕様（ハブ D-04 P3 の寸法線、A-03 G60「通り芯のスパン・全体・外壁・住戸の幅に mm で自動で付く（必須）」）:
// 並んだ位置（通り芯の位置や住戸の境界）の、隣り合う 2 つの間ごとに 1 本の寸法（長さ mm）を返す。
// 仕様 1: 間隔がばらばらでも、隣り合う位置の間ごとに 1 本。長さは位置の差（mm）。
// 仕様 2: 順が不同で、同じ位置が重なっていても、昇順にして重複を除く。
// 仕様 3: 位置が 1 つ以下なら、寸法は無い（空の配列）。
// 仕様 4: 渡した配列を書き換えない。
// 仕様 5: 位置が整数 mm なら、長さも整数 mm。
import { describe, expect, it } from 'vitest'
import { spanDimensions } from './spanDimension'

describe('spanDimensions（隣り合う位置の間の寸法）', () => {
  it('間隔がばらばらでも、隣り合う位置ごとに 1 本。長さは差（mm）', () => {
    expect(spanDimensions([0, 4000, 8200, 12000])).toEqual([
      { fromMm: 0, toMm: 4000, lengthMm: 4000 },
      { fromMm: 4000, toMm: 8200, lengthMm: 4200 },
      { fromMm: 8200, toMm: 12000, lengthMm: 3800 },
    ])
  })

  it('順が不同で同じ位置が重なっていても、昇順にして重複を除く', () => {
    expect(spanDimensions([8000, 0, 8000, 4000])).toEqual([
      { fromMm: 0, toMm: 4000, lengthMm: 4000 },
      { fromMm: 4000, toMm: 8000, lengthMm: 4000 },
    ])
  })

  it('位置が 1 つ以下なら、寸法は無い', () => {
    expect(spanDimensions([])).toEqual([])
    expect(spanDimensions([5000])).toEqual([])
    expect(spanDimensions([5000, 5000])).toEqual([])
  })

  it('渡した配列を書き換えない', () => {
    const input = Object.freeze([8000, 0, 4000])
    spanDimensions(input)
    expect([...input]).toEqual([8000, 0, 4000])
  })

  it('位置が整数 mm なら、長さも整数 mm', () => {
    for (const d of spanDimensions([0, 3333, 9999])) expect(Number.isInteger(d.lengthMm)).toBe(true)
  })
})
