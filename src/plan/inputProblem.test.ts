// 仕様（統括の依頼 2026-11-06「P3 の画面に ZodError の JSON を出さない」。依頼 2b）:
// 仕様 7（戸数が空・不正）: 戸数が 1 以上の整数でなければ、「目標の戸数を入れてください（1 以上の整数）」の一文。
// 仕様 8（寸法が空・0）: 幅・奥行・廊下幅・住戸の奥行・スパンのどれかが 0 以下や数でなければ、その項目の一文。
// 仕様 9（問題なし）: 足りていれば null。
// 仕様 10（ZodError を出さない）: 検査の ZodError は、JSON や英文を出さず、入力を確かめる一文にする。
// 仕様 11（普通の Error）: 計算の理由（例: 偶数の差）は、今までどおりの文をそのまま出す。
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { missingDimensionOf, missingTargetOf, plainErrorTextOf } from './inputProblem'

const ok = { widthMm: 20_000, depthMm: 12_000, corridorMm: 1_600, unitDepthMm: 6_000, spanMm: 3_000 }

describe('入力の足りないところを一文で言う（仕様 7〜9）', () => {
  it('仕様 7: 戸数が 0・小数・数でない（空の欄）なら、戸数の一文', () => {
    expect(missingTargetOf(0)).toBe('目標の戸数を入れてください（1 以上の整数）')
    expect(missingTargetOf(2.5)).toBe('目標の戸数を入れてください（1 以上の整数）')
    expect(missingTargetOf(Number.NaN)).toBe('目標の戸数を入れてください（1 以上の整数）')
    expect(missingTargetOf(7)).toBeNull()
  })

  it('仕様 8: 寸法が 0（空の欄）なら、その項目の一文', () => {
    expect(missingDimensionOf({ ...ok, widthMm: 0 })).toBe('建物の幅を入れてください（mm）')
    expect(missingDimensionOf({ ...ok, corridorMm: Number.NaN })).toBe('廊下幅を入れてください（mm）')
    expect(missingDimensionOf({ ...ok, spanMm: -1 })).toBe('スパンを入れてください（mm）')
  })

  it('仕様 9: 足りていれば null', () => {
    expect(missingDimensionOf(ok)).toBeNull()
  })
})

describe('画面に出す文（仕様 10・11）', () => {
  it('仕様 10: ZodError は JSON や英文を出さず、入力を確かめる一文にする', () => {
    const zerr = z.number().positive().safeParse(0).error as z.ZodError
    const text = plainErrorTextOf(zerr)
    expect(text).toBe('入力の数を確かめてください（数の範囲が正しくありません）')
    expect(text).not.toMatch(/[[{]|Too small/)
  })

  it('仕様 11: 普通の Error の文は、今までどおりそのまま出す', () => {
    expect(plainErrorTextOf(new Error('建物の幅と廊下の幅の差は偶数にする（中央に通すため）'))).toBe(
      '建物の幅と廊下の幅の差は偶数にする（中央に通すため）',
    )
  })
})
