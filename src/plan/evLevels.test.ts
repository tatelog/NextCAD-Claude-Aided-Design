// 仕様: 階別データ（A-03 G17「EV は昇降路が通る階・停止階・ホール確保階を階別に持つ」、D-04 P3 のコア、D-04 P2 のボリューム）。
// 階数・階高は D-03 E-09 の storey_count / storey_height と揃える（階高は mm の整数）。
// 昇降路は全階を通る。ホール確保は停止階と同じ扱い（この段階）。停止しない階は到達できない階として返す。
import { describe, expect, it } from 'vitest'
import { buildEvLevels } from './evLevels'

const all = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

describe('階別データの高さ', () => {
  it('総高は階数×階高（mm の整数）になる', () => {
    const r = buildEvLevels({ storeyCount: 8, storeyHeightMm: 3200, evStops: all(8), evCount: 2 })
    expect(r.total_height).toBe(25600)
  })

  it('各階の高さの範囲は下の階の天端から始まり、隣り合う階でつながる', () => {
    const r = buildEvLevels({ storeyCount: 3, storeyHeightMm: 3000, evStops: all(3), evCount: 1 })
    expect(r.storeys.map((s) => [s.z_from_mm, s.z_to_mm])).toEqual([
      [0, 3000],
      [3000, 6000],
      [6000, 9000],
    ])
  })
})

describe('昇降路・停止・ホール', () => {
  it('昇降路はすべての階を通る', () => {
    const r = buildEvLevels({ storeyCount: 4, storeyHeightMm: 3200, evStops: [1, 4], evCount: 1 })
    expect(r.storeys.every((s) => s.shaft)).toBe(true)
  })

  it('停止階は指定された階だけ true になる', () => {
    const r = buildEvLevels({ storeyCount: 12, storeyHeightMm: 3200, evStops: all(8), evCount: 2 })
    expect(r.storeys.map((s) => s.ev_stop)).toEqual([
      true, true, true, true, true, true, true, true, false, false, false, false,
    ])
  })

  it('ホールは停止階と同じ扱いになる', () => {
    const r = buildEvLevels({ storeyCount: 5, storeyHeightMm: 3200, evStops: [1, 3, 5], evCount: 1 })
    expect(r.storeys.map((s) => s.hall)).toEqual(r.storeys.map((s) => s.ev_stop))
  })
})

describe('到達できない階', () => {
  it('停止しない階を unreachable_storeys に入れる', () => {
    const r = buildEvLevels({ storeyCount: 12, storeyHeightMm: 3200, evStops: all(8), evCount: 2 })
    expect(r.unreachable_storeys).toEqual([9, 10, 11, 12])
  })

  it('全階が停止階なら unreachable_storeys は空になる', () => {
    const r = buildEvLevels({ storeyCount: 6, storeyHeightMm: 3200, evStops: all(6), evCount: 1 })
    expect(r.unreachable_storeys).toEqual([])
  })

  it('入口（1階）が停止しなければ、1階も到達できない階に含める', () => {
    const r = buildEvLevels({ storeyCount: 3, storeyHeightMm: 3200, evStops: [2, 3], evCount: 1 })
    expect(r.unreachable_storeys).toEqual([1])
  })
})

describe('EV コア', () => {
  it('EV 本数だけコアを作り、id は ev-1 から連番になる', () => {
    const r = buildEvLevels({ storeyCount: 3, storeyHeightMm: 3200, evStops: all(3), evCount: 3 })
    expect(r.ev_cores.map((c) => c.id)).toEqual(['ev-1', 'ev-2', 'ev-3'])
  })

  it('各コアの停止階は evStops を昇順・重複なしにしたものになる', () => {
    const r = buildEvLevels({ storeyCount: 3, storeyHeightMm: 3200, evStops: [3, 1, 3, 2], evCount: 1 })
    expect(r.ev_cores[0]!.stop_storeys).toEqual([1, 2, 3])
    expect(r.ev_cores[0]!.hall_storeys).toEqual([1, 2, 3])
  })

  it('各コアの昇降路は全階を通る', () => {
    const r = buildEvLevels({ storeyCount: 3, storeyHeightMm: 3200, evStops: [1, 3], evCount: 1 })
    expect(r.ev_cores[0]!.shaft_storeys).toEqual([1, 2, 3])
  })

  it('evCount が 0 ならコアは作らない', () => {
    const r = buildEvLevels({ storeyCount: 3, storeyHeightMm: 3200, evStops: all(3), evCount: 0 })
    expect(r.ev_cores).toEqual([])
  })
})

describe('入力の検証', () => {
  it('階高が 0 以下、または整数でなければ失敗する', () => {
    expect(() => buildEvLevels({ storeyCount: 3, storeyHeightMm: 0, evStops: all(3), evCount: 1 })).toThrow()
    expect(() => buildEvLevels({ storeyCount: 3, storeyHeightMm: 3200.5, evStops: all(3), evCount: 1 })).toThrow()
  })

  it('階数が 1 未満なら失敗する', () => {
    expect(() => buildEvLevels({ storeyCount: 0, storeyHeightMm: 3200, evStops: [], evCount: 1 })).toThrow()
  })

  it('停止階が 1 より小さい、または階数より大きければ失敗する', () => {
    expect(() => buildEvLevels({ storeyCount: 3, storeyHeightMm: 3200, evStops: [0, 1], evCount: 1 })).toThrow()
    expect(() => buildEvLevels({ storeyCount: 3, storeyHeightMm: 3200, evStops: [1, 4], evCount: 1 })).toThrow()
  })
})
