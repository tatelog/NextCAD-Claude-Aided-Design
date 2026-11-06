import { expect, it } from 'vitest'
import { visibleSlopeBoundaries } from './slopeVisibility'
it('表示対象だけを選び、計算用の境界は変更しない', () => {
  const boundaries = [{ kind: 'north' as const }, { kind: 'road' as const }, { kind: 'adjacent' as const }]
  expect(visibleSlopeBoundaries(boundaries, { north: true, road: false, adjacent: false })).toEqual([boundaries[0]])
  expect(visibleSlopeBoundaries(boundaries, { north: false, road: true, adjacent: true })).toEqual([boundaries[1], boundaries[2]])
  expect(boundaries).toHaveLength(3)
})
