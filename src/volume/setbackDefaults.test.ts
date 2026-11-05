// 仕様（統括の依頼 2026-11-05、t62。ハブ A-03 G104・G115、D-02 C4 の仮置き。G115 で代表が委任、A-07 E-89 で裏取り済み）:
// 敷地からの離れの既定値。隣地境界は 500 mm（江東区マンション条例 14 条と規則 10 条の努力義務、民法 234 条の 50 cm）。道路境界は 0 mm。
// 仕様 1（値）: 隣地の既定は 500 mm、道路の既定は 0 mm。
// 仕様 2（上書き）: 地区計画の壁面の位置の制限がある敷地は、設定値で既定を上書きできる。上書きは、その種類（隣地・道路）だけに効く。
// 仕様 3（辺ごと）: 離れは辺ごとに測る（G104）。西と南の辺のうち、前面道路の辺は 0 mm、それ以外は 500 mm。
// 仕様 4（複数の道路）: 道路が複数に面するときは、幅員の大きい道路を前面道路とする（G115）。同じ幅員なら先の道路。道路が無ければ無い。
// 仕様 5（入力の初期値・自動配置）: 離れの入力欄の初期値は、この既定。自動で外形を置くときも、この既定を使う。
// 注: 地区計画の値は持たない（今は設定値で上書きする形にしておく）。
import { describe, expect, it } from 'vitest'
import { DUMMY_PARCEL } from '../plan/dummyParcel'
import {
  NEIGHBOR_SETBACK_DEFAULT_MM,
  ROAD_SETBACK_DEFAULT_MM,
  frontRoadEdgeOf,
  setbackDefaultOf,
  setbackInitialOf,
} from './setbackDefaults'

describe('既定の値（仕様 1）', () => {
  it('隣地は 500 mm、道路は 0 mm', () => {
    expect(NEIGHBOR_SETBACK_DEFAULT_MM).toBe(500)
    expect(ROAD_SETBACK_DEFAULT_MM).toBe(0)
    expect(setbackDefaultOf(false)).toBe(500)
    expect(setbackDefaultOf(true)).toBe(0)
  })
})

describe('地区計画の上書き（仕様 2）', () => {
  it('設定値で上書きでき、上書きは、その種類だけに効く', () => {
    expect(setbackDefaultOf(false, { neighborMm: 600 })).toBe(600)
    expect(setbackDefaultOf(true, { neighborMm: 600 })).toBe(0)
    expect(setbackDefaultOf(true, { roadMm: 1000 })).toBe(1000)
    expect(setbackDefaultOf(false, { roadMm: 1000 })).toBe(500)
  })
})

describe('辺ごと（仕様 3）', () => {
  it('西と南の辺は、前面道路の辺なら 0 mm、それ以外は 500 mm（ダミー筆界の辺 0 は下、辺 3 は左）', () => {
    expect(setbackInitialOf(DUMMY_PARCEL, 0)).toEqual({ westMm: 500, southMm: 0 })
    expect(setbackInitialOf(DUMMY_PARCEL, 3)).toEqual({ westMm: 0, southMm: 500 })
    expect(setbackInitialOf(DUMMY_PARCEL, 1)).toEqual({ westMm: 500, southMm: 500 })
  })

  it('長方形でない敷地は、既定を出さない（null。入力欄は空のまま）', () => {
    const tri = [
      { x: 0, y: 0 },
      { x: 10_000, y: 0 },
      { x: 0, y: 10_000 },
    ]
    expect(setbackInitialOf(tri, 0)).toBeNull()
  })
})

describe('複数の道路（仕様 4）', () => {
  it('幅員の大きい道路の辺を前面道路とする。同じ幅員なら先の道路', () => {
    expect(
      frontRoadEdgeOf([
        { edge: 0, widthMm: 4000 },
        { edge: 2, widthMm: 6000 },
      ]),
    ).toBe(2)
    expect(
      frontRoadEdgeOf([
        { edge: 0, widthMm: 4000 },
        { edge: 2, widthMm: 4000 },
      ]),
    ).toBe(0)
    expect(frontRoadEdgeOf([])).toBeNull()
  })
})

describe('初期値と自動配置（仕様 5）', () => {
  it('前面道路の辺（既定の 0）が南なら、西は 500 mm・南は 0 mm が初期値になる', () => {
    expect(setbackInitialOf(DUMMY_PARCEL, 0)).toEqual({ westMm: 500, southMm: 0 })
  })
})
