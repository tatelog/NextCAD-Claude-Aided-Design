// 仕様（ハブ A-03 G28・D-02 C11。出典: 建築基準法施行令 第136条の2 第1項（325CO0000000338、2026-11-04 に e-Gov の本文を確認。要約は WebFetch の要約））:
// 令 136 条の 2 の号ごとに、満たすべき構造・性能の項目（イ・ロ・延焼防止など）を一覧にする。部材の耐火性能は、この app には入力が無いので、どの項目も「判定不能」と出す（推測で埋めない）。
// 仕様 1: 第一号・第二号・第三号・第四号は、イ（他の条の基準に適合）とロ（延焼防止時間の代替）の 2 項目。第三号は外壁開口部の 20 分間の要件を加える。
// 仕様 2: 第五号（門・塀）は、延焼防止上支障のない構造、の 1 項目。
// 仕様 3: 対象外は、項目を出さない。
// 仕様 4: どの項目も「判定不能」。同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import { fireStructureItems } from './fireStructure'

describe('令 136 条の 2 の構造・性能の項目（仕様 1〜4）', () => {
  it('仕様 1: 第一号・第二号はイとロの 2 項目。第三号は外壁開口部の項目を加える', () => {
    expect(fireStructureItems('第一号')).toHaveLength(2)
    expect(fireStructureItems('第二号')).toHaveLength(2)
    expect(fireStructureItems('第四号')).toHaveLength(2)
    expect(fireStructureItems('第三号').length).toBeGreaterThan(2)
  })

  it('仕様 2: 第五号は 1 項目', () => {
    expect(fireStructureItems('第五号')).toHaveLength(1)
  })

  it('仕様 3: 対象外は項目を出さない', () => {
    expect(fireStructureItems('対象外')).toEqual([])
  })

  it('仕様 4: どの項目も判定不能。同じ入力には同じ出力', () => {
    const items = fireStructureItems('第一号')
    expect(items.every((i) => i.status === '判定不能')).toBe(true)
    expect(fireStructureItems('第一号')).toEqual(items)
  })
})
