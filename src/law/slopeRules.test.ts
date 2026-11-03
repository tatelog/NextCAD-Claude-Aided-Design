// 仕様: 斜線制限の規則（建築基準法 第56条・別表第三。e-Gov 法令 API の本文、2026-11-03 取得）。
// 仕様 1（道路・別表第三）: 用途地域の区分と容積率（％）で、前面道路の反対側の境界線からの距離（20/25/30/35 m など）と係数が決まる。
//   容積率の境界は「以下」（例: 十分の二十以下 = 200％以下）。
// 仕様 2（北側・第56条第1項第3号）: 第一種・第二種低層住居専用地域、田園住居地域は立ち上がり 5 m、第一種・第二種中高層住居専用地域は 10 m。係数は 1.25。他の地域には適用しない（対象外）。
// 仕様 3（隣地・第56条第1項第2号）: 係数 1.25 は高さ 20 m 超、係数 2.5 は高さ 31 m 超の部分に適用。中高層住専・住居系は 1.25、近隣商業・商業・準工業・工業・工業専用・高層住居誘導は 2.5。
//   低層住専・田園住居は隣地斜線の対象外。用途地域の指定のない区域は 1.25 と 2.5 のどちらかを特定行政庁が定めるので「判定不能」。
// 仕様 4: 容積率や用途地域が分からないときは「判定不能」として返し、推測で埋めない。
import { describe, expect, it } from 'vitest'
import { roadSlopeRule, northSlopeRule, adjacentSlopeRule } from './slopeRules'

describe('roadSlopeRule（別表第三）', () => {
  it('第一種・第二種住居地域など（別表第三 一の項）: 容積率 200％以下は 20 m・1.25', () => {
    expect(roadSlopeRule({ zone: '住居系', farPercent: 200 })).toEqual({ status: '適用', distanceMm: 20_000, coefficient: 1.25 })
  })

  it('同じ区分で 300％ を超え 400％ 以下は 30 m。400％ 超は 35 m', () => {
    expect(roadSlopeRule({ zone: '住居系', farPercent: 300 })).toMatchObject({ distanceMm: 25_000 })
    expect(roadSlopeRule({ zone: '住居系', farPercent: 400 })).toMatchObject({ distanceMm: 30_000 })
    expect(roadSlopeRule({ zone: '住居系', farPercent: 401 })).toMatchObject({ distanceMm: 35_000 })
  })

  it('近隣商業・商業（別表第三 二の項）は係数 1.5、容積率 400％ 以下は 20 m', () => {
    expect(roadSlopeRule({ zone: '商業系', farPercent: 400 })).toEqual({ status: '適用', distanceMm: 20_000, coefficient: 1.5 })
  })

  it('準工業・工業（別表第三 三の項）は係数 1.5、容積率 200％ 以下は 20 m', () => {
    expect(roadSlopeRule({ zone: '準工・工業系', farPercent: 200 })).toEqual({ status: '適用', distanceMm: 20_000, coefficient: 1.5 })
  })

  it('用途地域の指定がなければ判定不能（係数が 1.25 か 1.5 か特定行政庁が定める）', () => {
    expect(roadSlopeRule({ zone: '指定なし', farPercent: 200 })).toEqual({ status: '判定不能' })
  })
})

describe('northSlopeRule（第56条第1項第3号）', () => {
  it('低層住専・田園住居は立ち上がり 5 m、係数 1.25', () => {
    expect(northSlopeRule({ zone: '低層住専' })).toEqual({ status: '適用', riseMm: 5_000, coefficient: 1.25 })
  })

  it('中高層住専は立ち上がり 10 m、係数 1.25', () => {
    expect(northSlopeRule({ zone: '中高層住専' })).toEqual({ status: '適用', riseMm: 10_000, coefficient: 1.25 })
  })

  it('それ以外の地域は対象外', () => {
    expect(northSlopeRule({ zone: '商業系' })).toEqual({ status: '対象外' })
  })
})

describe('adjacentSlopeRule（第56条第1項第2号）', () => {
  it('中高層住専・住居系は係数 1.25、立ち上がり 20 m', () => {
    expect(adjacentSlopeRule({ zone: '住居系' })).toEqual({ status: '適用', riseMm: 20_000, coefficient: 1.25 })
  })

  it('商業・準工・工業は係数 2.5、立ち上がり 31 m', () => {
    expect(adjacentSlopeRule({ zone: '商業系' })).toEqual({ status: '適用', riseMm: 31_000, coefficient: 2.5 })
    expect(adjacentSlopeRule({ zone: '準工・工業系' })).toEqual({ status: '適用', riseMm: 31_000, coefficient: 2.5 })
  })

  it('低層住専は対象外、指定なしは判定不能', () => {
    expect(adjacentSlopeRule({ zone: '低層住専' })).toEqual({ status: '対象外' })
    expect(adjacentSlopeRule({ zone: '指定なし' })).toEqual({ status: '判定不能' })
  })
})
