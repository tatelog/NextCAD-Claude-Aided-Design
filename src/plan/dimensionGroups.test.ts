import { expect, it } from 'vitest'
import { groupedSpanDimensions } from './spanDimension'
it('等間隔をまとめ、端数と離れた同寸法は別に残す', () => {
  expect(groupedSpanDimensions([0, 3000, 6000, 6500, 9500])).toEqual([
    { fromMm: 0, toMm: 6000, lengthMm: 3000, count: 2 },
    { fromMm: 6000, toMm: 6500, lengthMm: 500, count: 1 },
    { fromMm: 6500, toMm: 9500, lengthMm: 3000, count: 1 },
  ])
})
