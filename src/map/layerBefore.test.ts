// 仕様（統括の依頼 2026-11-06。3: 地図の筆の層の追加は、基準の層（neighbors）がまだ無いときも落ちない）:
// 仕様 3a: 基準の層が地図にあれば、その前に足す（基準の層の id を返す）。
// 仕様 3b: 基準の層がまだ無ければ、基準を付けずに足す（undefined を返す。落ちない）。
import { describe, expect, it } from 'vitest'
import { layerBeforeOf } from './layerBefore'

describe('地図の層を足す位置（仕様 3a・3b）', () => {
  it('仕様 3a: 基準の層（neighbors）が地図にあれば、その前に足す', () => {
    expect(layerBeforeOf(['background', 'neighbors', 'site'], 'neighbors')).toBe('neighbors')
  })

  it('仕様 3b: 基準の層がまだ無ければ、基準を付けずに足す（undefined）', () => {
    expect(layerBeforeOf(['background'], 'neighbors')).toBeUndefined()
    expect(layerBeforeOf([], 'neighbors')).toBeUndefined()
  })
})
