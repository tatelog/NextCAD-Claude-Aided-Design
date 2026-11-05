// 仕様（A-03 G75・D-04 P3「左メニュー」）: 共用部はグループとして持つ。基準階と 1F で、入る共用部の名前を決める。
// 仕様 1: 基準階の共用部は、廊下・階段 A・階段 B・EV ホール・EPS・DS。
// 仕様 2: 1F の共用部は、エントランス・風除室・ロビー・管理室・メールコーナー・ゴミ置場。
// 仕様 3: 任意の共用部は、ジム・ゲストルーム・集会室。集会室は 1F だけ。ジムとゲストルームは階を問わない（仕様に階の指定が無いため）。
// 仕様 4: 任意の共用部は、選んだものだけ入る。選んでいない名前や、その階に無い名前は入らない。
// 仕様 5: 同じ階の中で、共用部の名前は重複しない。
import { describe, expect, it } from 'vitest'
import { commonAreaCountsOf, commonAreaGroups, commonAreasOf, firstFloorCountsOf } from './commonAreas'

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

// 仕様 7（基準階の数）: 基準階の共用部の数は、自動作成の結果から数える。廊下 = 廊下の数、階段 A・B と EV ホール = コアの id（stairA・stairB・evHall）、EPS と DS = 縦シャフトの種類。
// 仕様 8（1F）: 1F の共用部には数を出さない（配置は未配線）。基準階の名前は commonAreasOf と同じ並び。
describe('共用部の数（基準階）', () => {
  it('仕様 7: 自動作成の結果から、基準階の 6 種類の数を数える', () => {
    const counts = commonAreaCountsOf({
      corridors: [{}],
      cores: [{ id: 'stairA' }, { id: 'stairB' }, { id: 'evHall' }, { id: 'core' }],
      shafts: [{ kind: 'PS' }, { kind: 'EPS' }, { kind: 'DS' }],
    })
    expect(counts).toEqual([
      { name: '廊下', count: 1 },
      { name: '階段 A', count: 1 },
      { name: '階段 B', count: 1 },
      { name: 'EV ホール', count: 1 },
      { name: 'EPS', count: 1 },
      { name: 'DS', count: 1 },
    ])
  })

  it('仕様 7（結果が無いとき）: 6 種類とも 0', () => {
    expect(commonAreaCountsOf({}).map((c) => c.count)).toEqual([0, 0, 0, 0, 0, 0])
  })

  it('仕様 8: 名前は基準階の必須の名前と同じ並び', () => {
    expect(commonAreaCountsOf({}).map((c) => c.name)).toEqual(commonAreasOf('基準階'))
  })
})

// 仕様 9（1F の数）: 1F の共用部の数は、利用者が基準階の区画に 1F の名前を付けた数で数える（1F 専用の平面はまだ無い）。
// 1F の必須の名前だけを、仕様の並びで出す。名前の無い区画と、1F の名前でない区画は数えない。
describe('1F の共用部の数（区画に名前を付けた数）', () => {
  it('仕様 9: 名前を付けた区画の数を、1F の名前ごとに数える', () => {
    const counts = firstFloorCountsOf({ 'cell-1': 'エントランス', 'cell-2': 'エントランス', 'cell-3': 'ゴミ置場', 'cell-4': '廊下' })
    expect(counts).toEqual([
      { name: 'エントランス', count: 2 },
      { name: '風除室', count: 0 },
      { name: 'ロビー', count: 0 },
      { name: '管理室', count: 0 },
      { name: 'メールコーナー', count: 0 },
      { name: 'ゴミ置場', count: 1 },
    ])
    expect(firstFloorCountsOf({}).map((c) => c.name)).toEqual(commonAreasOf('1F'))
  })
})
