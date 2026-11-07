import { describe, expect, it } from 'vitest'
import { scaleBarOf } from './scaleBar'
describe('画面上の距離尺', () => {
  it('表示幅と実寸が一致する', () => {
    for (const mmPerPx of [0.5, 10, 83, 250, 1500]) {
      const bar = scaleBarOf(mmPerPx)
      expect(bar.widthPx * mmPerPx).toBeCloseTo(bar.lengthMm)
      expect(bar.widthPx).toBeGreaterThan(0)
      expect(bar.widthPx).toBeLessThanOrEqual(120)
    }
  })
})
