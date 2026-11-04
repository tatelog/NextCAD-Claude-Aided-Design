// 仕様（P1 を MapLibre に置き換えたときの、地図の見た目と初期表示）から書いたテスト。実装を読まずに書いている。
// 仕様:
// - 基図は国土地理院の標準地図。出典は「地図 国土地理院」。彩度を -0.6 に下げて表示する
// - 道路は幅員区分 1〜5 を、5色の線で描く。線の太さは、ズーム 13 以下で通常の半分、ズーム 17 以上で通常どおり
// - 初期表示は、江東区役所（139.81636, 35.672993）と筆 2-7（新砂３丁目、重心 139.829826, 35.667401）の中間。ズーム 14.6、傾き 45 度、向き -20 度
// - 初期表示では、筆 2-7（ID H000000013）を選択した状態にする
// - 筆の情報は「選択した筆：地番 …（大字名丁目名）、精度区分 …、地図名 …」の形で出す。精度区分がなければ「不明」
import { describe, expect, it } from 'vitest'
import { GSI_BASEMAP_TILES, GSI_BASEMAP_ATTRIBUTION, gsiBasemapLayer } from './basemap'
import { ROAD_WIDTH_CLASSES, roadWidthPx } from './roadStyle'
import { DEMO_INITIAL_VIEW, DEMO_PARCEL_ID } from './initialView'
import { formatParcelInfo } from './parcelInfo'

describe('gsiBasemapLayer', () => {
  it('国土地理院の標準地図タイルを使い、出典を「地図 国土地理院」にする', () => {
    expect(GSI_BASEMAP_TILES).toEqual(['https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'])
    expect(GSI_BASEMAP_ATTRIBUTION).toBe('地図 国土地理院')
  })

  it('ラスター層の彩度を -0.6 にする', () => {
    const layer = gsiBasemapLayer()
    expect(layer.type).toBe('raster')
    expect(layer.paint).toEqual({ 'raster-saturation': -0.6 })
  })
})

describe('ROAD_WIDTH_CLASSES と roadWidthPx', () => {
  it('幅員区分は 1〜5 の5段階で、ラベルと色を持つ', () => {
    expect(ROAD_WIDTH_CLASSES.map((c) => c.k)).toEqual([1, 2, 3, 4, 5])
    expect(ROAD_WIDTH_CLASSES.map((c) => c.label)).toEqual([
      '3m未満',
      '3m〜5.5m未満',
      '5.5m〜13m未満',
      '13m〜19.5m未満',
      '19.5m以上',
    ])
    for (const c of ROAD_WIDTH_CLASSES) expect(c.color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('ズーム 13 以下では通常の半分、ズーム 17 以上では通常どおりの太さになる', () => {
    const base = ROAD_WIDTH_CLASSES[4]!.px
    expect(roadWidthPx(5, 13)).toBeCloseTo(base * 0.5, 6)
    expect(roadWidthPx(5, 9)).toBeCloseTo(base * 0.5, 6)
    expect(roadWidthPx(5, 17)).toBeCloseTo(base, 6)
    expect(roadWidthPx(5, 20)).toBeCloseTo(base, 6)
  })

  it('ズーム 13 と 17 の間は直線で変わる', () => {
    const base = ROAD_WIDTH_CLASSES[1]!.px
    expect(roadWidthPx(2, 15)).toBeCloseTo(base * 0.75, 6)
  })
})

describe('初期表示（DEMO_INITIAL_VIEW）', () => {
  it('区役所と筆 2-7 の中間を中心にし、ズーム 14.6、傾き 45、向き -20 にする', () => {
    const midLon = (139.81636 + 139.829826) / 2
    const midLat = (35.672993 + 35.667401) / 2
    expect(DEMO_INITIAL_VIEW.center[0]).toBeCloseTo(midLon, 4)
    expect(DEMO_INITIAL_VIEW.center[1]).toBeCloseTo(midLat, 4)
    expect(DEMO_INITIAL_VIEW.zoom).toBe(14.6)
    expect(DEMO_INITIAL_VIEW.pitch).toBe(45)
    expect(DEMO_INITIAL_VIEW.bearing).toBe(-20)
  })

  it('最初に選択する筆は、ID H000000013（筆 2-7）', () => {
    expect(DEMO_PARCEL_ID).toBe('H000000013')
  })
})

describe('formatParcelInfo', () => {
  it('地番・大字丁目・精度区分・地図名を、決まった形で出す', () => {
    expect(
      formatParcelInfo({
        地番: '2-7',
        大字名: '新砂',
        丁目名: '３丁目',
        精度区分: '甲二',
        地図名: '10121_hosei_20121129083849',
      }),
    ).toBe('選択した筆：地番 2-7（新砂３丁目）、精度区分 甲二、地図名 10121_hosei_20121129083849')
  })

  it('精度区分がなければ「不明」と出す', () => {
    expect(formatParcelInfo({ 地番: '1-1', 大字名: '北砂', 丁目名: '４丁目', 地図名: 'x' })).toBe(
      '選択した筆：地番 1-1（北砂４丁目）、精度区分 不明、地図名 x',
    )
  })
})
