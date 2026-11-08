import { describe, expect, it } from 'vitest'
import { ICHI_NOTE, judgeIchi, type IchiInput } from './fireIchi'

// 仕様（ハブ A-03 G85。統括の 2026-11-04 の決定、A-03 版 48）から書いたテスト。
// - 令 136 条の 2 は、イ（主要構造部が耐火構造 ＋ 外壁開口部設備が防火設備）だけで判定する。
// - 主要構造部の耐火構造は、令 107 条の必要時間を、建物の地上の階数の区分で決めて比べる（部材の耐火時間は入力）。
// - ロ（延焼防止時間）は計算しない。「ロ（延焼防止時間）は対象外」と明示する。
// - 判定不能は、イの入力が足りないときだけ。不適合は判定不能より優先する（既存の全体判定と同じ）。

const ALL = ['柱', 'はり', '床', '間仕切壁', '外壁', '屋根', '階段'] as const

/** 3 階建て（区分 1）。必要時間は 柱・はり・床・間仕切壁・外壁 60、屋根・階段 30 */
function ratingsAll(v: number): IchiInput['ratings'] {
  return Object.fromEntries(ALL.map((c) => [c, v])) as IchiInput['ratings']
}

describe('イの判定（令 136 条の 2）', () => {
  it('ロは対象外と明示する（計算していない）', () => {
    expect(ICHI_NOTE).toBe('ロ（延焼防止時間）は対象外（計算していない）')
  })

  it('3 階建てで、部材が必要時間以上、外壁開口部設備が防火設備なら適合', () => {
    const r = judgeIchi(3, { ratings: ratingsAll(60), fireDoor: true })
    expect(r.result).toBe('適合')
    expect(r.reasons).toEqual([])
  })

  it('6 階建て（区分 2）で、柱の耐火時間が必要時間（90 分）に届かなければ不適合（柱の名前を理由に出す）', () => {
    const ratings = { ...ratingsAll(90), 柱: 60 }
    const r = judgeIchi(6, { ratings, fireDoor: true })
    expect(r.result).toBe('不適合')
    expect(r.reasons.join(' ')).toContain('柱')
  })

  it('部材の耐火時間が一つでも未入力なら判定不能（その部材の名前を理由に出す）', () => {
    const ratings = { ...ratingsAll(60), 外壁: null }
    const r = judgeIchi(3, { ratings, fireDoor: true })
    expect(r.result).toBe('判定不能')
    expect(r.reasons.join(' ')).toContain('外壁')
  })

  it('外壁開口部設備が未入力なら判定不能（理由に外壁開口部設備を出す）', () => {
    const r = judgeIchi(3, { ratings: ratingsAll(60), fireDoor: null })
    expect(r.result).toBe('判定不能')
    expect(r.reasons.join(' ')).toContain('外壁開口部設備')
  })

  it('外壁開口部設備が防火設備でなければ不適合', () => {
    const r = judgeIchi(3, { ratings: ratingsAll(60), fireDoor: false })
    expect(r.result).toBe('不適合')
    expect(r.reasons.join(' ')).toContain('防火設備ではない')
  })

  it('不適合が一つでもあれば、判定不能が残っていても全体は不適合', () => {
    const ratings = { ...ratingsAll(90), 柱: 60, 外壁: null }
    const r = judgeIchi(6, { ratings, fireDoor: true })
    expect(r.result).toBe('不適合')
  })

  it('同じ入力からは同じ結果が出る（決定論）', () => {
    const input: IchiInput = { ratings: ratingsAll(60), fireDoor: true }
    expect(judgeIchi(3, input)).toEqual(judgeIchi(3, input))
  })
})
