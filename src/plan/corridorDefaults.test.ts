// 仕様（ハブ A-03 G135。統括の依頼 2026-11-05）: 廊下幅の既定は仮置き（出典は A-07 で確認。provisional の印を持つ）。
// 仕様 1: 中廊下の既定は 1,600 mm。
// 仕様 2: 片廊下の既定は 1,200 mm。
// 仕様 3: 階段室・ツインは、この決定の対象外（既定を持たない）。
import { describe, expect, it } from 'vitest'
import { corridorDefaultOf } from './corridorDefaults'

describe('廊下幅の既定（G135）', () => {
  it('仕様 1: 中廊下の既定は 1,600 mm（仮置き）', () => {
    expect(corridorDefaultOf('中廊下')).toEqual({ mm: 1600, provisional: true })
  })

  it('仕様 2: 片廊下の既定は 1,200 mm（仮置き）', () => {
    expect(corridorDefaultOf('片廊下')).toEqual({ mm: 1200, provisional: true })
  })

  it('仕様 3: 階段室・ツインは既定を持たない', () => {
    expect(corridorDefaultOf('階段室')).toBeNull()
    expect(corridorDefaultOf('ツイン')).toBeNull()
  })
})
