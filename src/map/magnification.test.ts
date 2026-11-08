import { describe, expect, it } from 'vitest'
import { relativeMapMagnification } from './magnification'

describe('地図の初期表示に対する倍率', () => {
  it('初期表示は1倍', () => expect(relativeMapMagnification(16, 16)).toBe(1))
  it('ズームが1増えると2倍', () => expect(relativeMapMagnification(17, 16)).toBe(2))
  it('ズームが1減ると半分', () => expect(relativeMapMagnification(15, 16)).toBe(0.5))
})
