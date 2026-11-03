// 仕様（A-03 G75・D-04 P3「左メニュー」）: 共用部はグループとして持つ。基準階と 1F で、入る共用部の名前を決める。
// 仕様 1: 基準階の共用部は、廊下・階段 A・階段 B・EV ホール・EPS・DS。
// 仕様 2: 1F の共用部は、エントランス・風除室・ロビー・管理室・メールコーナー・ゴミ置場。
// 仕様 3: 任意の共用部は、ジム・ゲストルーム・集会室。集会室は 1F だけ。ジムとゲストルームは階を問わない（仕様に階の指定が無いため）。
// 仕様 4: 任意の共用部は、選んだものだけ入る。選んでいない名前や、その階に無い名前は入らない。
// 仕様 5: 同じ階の中で、共用部の名前は重複しない。
import { describe, expect, it } from 'vitest'
import { commonAreaGroups, commonAreasOf } from './commonAreas'

// 仕様 6（左メニューのグループ）: 共用部のグループは、基準階・1F の順に、各階の必須の名前を持つ。commonAreasOf と同じ名前。
describe('共用部のグループ（左メニュー用）', () => {
  it('仕様 6: 基準階・1F の順に、各階の必須の名前を並べる（commonAreasOf と同じ）', () => {
    expect(commonAreaGroups()).toEqual([
      { floor: '基準階', names: commonAreasOf('基準階') },
      { floor: '1F', names: commonAreasOf('1F') },
    ])
  })
})

describe('共用部の名前（階ごと）', () => {
  it('仕様 1: 基準階の必須の共用部', () => {
    expect(commonAreasOf('基準階')).toEqual(['廊下', '階段 A', '階段 B', 'EV ホール', 'EPS', 'DS'])
  })

  it('仕様 2: 1F の必須の共用部', () => {
    expect(commonAreasOf('1F')).toEqual(['エントランス', '風除室', 'ロビー', '管理室', 'メールコーナー', 'ゴミ置場'])
  })

  it('仕様 3: 集会室は 1F だけ、ジムとゲストルームは階を問わない', () => {
    const all = ['ジム', 'ゲストルーム', '集会室']
    expect(commonAreasOf('1F', all)).toContain('集会室')
    expect(commonAreasOf('基準階', all)).not.toContain('集会室')
    expect(commonAreasOf('基準階', all)).toContain('ジム')
    expect(commonAreasOf('1F', all)).toContain('ゲストルーム')
  })

  it('仕様 4: 選んだ任意のものだけ入る。知らない名前は入らない', () => {
    expect(commonAreasOf('基準階', ['ジム'])).toEqual(['廊下', '階段 A', '階段 B', 'EV ホール', 'EPS', 'DS', 'ジム'])
    expect(commonAreasOf('1F', ['存在しない名前'])).toEqual(commonAreasOf('1F'))
  })

  it('仕様 5: 同じ階の中で名前は重複しない', () => {
    const names = commonAreasOf('1F', ['ジム', 'ゲストルーム', '集会室'])
    expect(new Set(names).size).toBe(names.length)
  })
})
