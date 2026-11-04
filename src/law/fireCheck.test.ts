// 仕様（建築基準法施行令第108条の3 第2項第四号ロ・第5項第三号の判定条件。G28 の判定の部品。組み合わせ規則とは別）:
// 仕様 1: 外壁の屋外火災保有耐火時間は、延焼のおそれのある部分では 60 分以上、それ以外の部分では 30 分以上なら適合。下回れば不適合。
// 仕様 2: 開口部設備の保有遮炎時間は、火災の継続時間以上なら適合。下回れば不適合。
// 仕様 3: 値が無い（未入力）ものは判定不能。判定不能と不適合が両方あれば、全体は不適合（不適合を優先）。
// 仕様 4: 全部が適合なら全体は適合。判定不能が残るなら全体は判定不能。
// 仕様 5: 同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import { checkWall, checkOpening, overallFireCheck } from './fireCheck'

describe('外壁の判定（仕様 1）', () => {
  it('延焼のおそれのある部分は 60 分以上で適合、59 分は不適合', () => {
    expect(checkWall({ id: 'w1', fireMin: 60, spreadRisk: true })).toBe('適合')
    expect(checkWall({ id: 'w1', fireMin: 59, spreadRisk: true })).toBe('不適合')
  })

  it('それ以外の部分は 30 分以上で適合、29 分は不適合', () => {
    expect(checkWall({ id: 'w2', fireMin: 30, spreadRisk: false })).toBe('適合')
    expect(checkWall({ id: 'w2', fireMin: 29, spreadRisk: false })).toBe('不適合')
  })
})

describe('開口部の判定（仕様 2）', () => {
  it('保有遮炎時間が火災の継続時間以上なら適合、下回れば不適合', () => {
    expect(checkOpening({ id: 'o1', holdMin: 20 }, 20)).toBe('適合')
    expect(checkOpening({ id: 'o1', holdMin: 19 }, 20)).toBe('不適合')
  })
})

describe('未入力と全体（仕様 3〜4）', () => {
  it('値が無いものは判定不能', () => {
    expect(checkWall({ id: 'w3', fireMin: undefined, spreadRisk: true })).toBe('判定不能')
    expect(checkOpening({ id: 'o2', holdMin: undefined }, 20)).toBe('判定不能')
  })

  it('不適合が一つでもあれば全体は不適合（判定不能より優先）', () => {
    expect(overallFireCheck(['適合', '判定不能', '不適合'])).toBe('不適合')
  })

  it('全部適合なら適合。判定不能が残るなら判定不能', () => {
    expect(overallFireCheck(['適合', '適合'])).toBe('適合')
    expect(overallFireCheck(['適合', '判定不能'])).toBe('判定不能')
  })
})

describe('同じ入力（仕様 5）', () => {
  it('同じ入力には同じ出力', () => {
    expect(checkWall({ id: 'w1', fireMin: 45, spreadRisk: true })).toBe(checkWall({ id: 'w1', fireMin: 45, spreadRisk: true }))
  })
})
