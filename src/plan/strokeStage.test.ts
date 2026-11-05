// 仕様（統括の依頼 2026-11-06。B: ドローの線は種類の線（F5）で作る）:
// 仕様 B1: ドローのモードで描いた線は、段階 F5（種類の線）で作る。押さえている間の判定と、右側の候補の確認の対象になる。
// 仕様 B2: システムのモードで描いた線は、段階 F4（外形）のまま（今のまま）。
import { describe, expect, it } from 'vitest'
import { strokeStageOf } from './strokeStage'

describe('描いた線の段階（仕様 B1・B2）', () => {
  it('仕様 B1: ドローのモードで描いた線は F5', () => {
    expect(strokeStageOf('drawing')).toBe('F5')
  })

  it('仕様 B2: システムのモードで描いた線は F4（外形）のまま', () => {
    expect(strokeStageOf('system')).toBe('F4')
  })
})
