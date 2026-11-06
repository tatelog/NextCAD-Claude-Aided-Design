import { expect, it } from 'vitest'
import { mapShownOf } from './volumeDisplay'
it('地図は位置に対応するタイルがあるときだけオンになる', () => {
  expect(mapShownOf(true, 0)).toBe(false)
  expect(mapShownOf(true, 9)).toBe(true)
  expect(mapShownOf(false, 9)).toBe(false)
})
