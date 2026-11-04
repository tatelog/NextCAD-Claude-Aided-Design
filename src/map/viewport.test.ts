// 仕様（P1 の地図の操作。代表の依頼「拡大縮小・対象案件の選択」）:
// 仕様 1: 拡大縮小は整数の 0〜18。範囲外は端に寄せる。数でない値は 0。
// 仕様 2: 地図の中心を表示の中央に置く。表示（768 px）の左上のワールド座標を出す。
// 仕様 3: 表示を覆うタイルは、中心の位置によらず全部含める。各タイルの画面上の位置を出す。
// 仕様 4: 画面上の点は経緯度に戻せる（クリックで対象地点を置くため）。
// 仕様 5: ドラッグした分だけ中心を動かす。緯度は Web メルカトルの範囲、経度は ±180 に収める。
// 仕様 6: 押した点と離した点の距離が 4 px 未満ならクリック、それ以上はドラッグ。
// 仕様 7: 経緯度の入力は、空・数でない・範囲外なら対象地点にしない（null）。
// 仕様 8: 同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import { lonLatFromWorldPixel, worldPixel } from './worldPixel'
import {
  MAX_ZOOM,
  VIEW_PX,
  clampZoom,
  isClick,
  panCenter,
  parseSitePoint,
  screenToLonLat,
  tileOnMap,
  tilesInView,
  viewOrigin,
  wheelZoomSteps,
  worldToScreen,
} from './viewport'

const KOTO = { lon: 139.814, lat: 35.67 }
const MAX_LAT = 85.05112878

describe('ズームの範囲（仕様 1）', () => {
  it('整数の 0〜18 に収め、範囲外は端に寄せる', () => {
    expect(MAX_ZOOM).toBe(18)
    expect(clampZoom(15.7)).toBe(15)
    expect(clampZoom(-3)).toBe(0)
    expect(clampZoom(25)).toBe(18)
  })

  it('数でない値は 0', () => {
    expect(clampZoom(Number.NaN)).toBe(0)
  })
})

describe('ホイールの段数（仕様 9）', () => {
  it('100 px ごとに 1 段。足りない分は持ち越す', () => {
    expect(wheelZoomSteps(0, 50)).toEqual({ steps: 0, rest: 50 })
    expect(wheelZoomSteps(50, 60)).toEqual({ steps: 1, rest: 10 })
  })

  it('一度に大きく動いたときは、その分だけ段が進む（deltaY の符号のまま。上へ回すと負、下へ回すと正）', () => {
    expect(wheelZoomSteps(0, -500)).toEqual({ steps: -5, rest: 0 })
    expect(wheelZoomSteps(0, 230)).toEqual({ steps: 2, rest: 30 })
  })

  it('同じ入力には同じ出力', () => {
    expect(wheelZoomSteps(30, -90)).toEqual(wheelZoomSteps(30, -90))
  })
})

describe('表示の左上と画面座標（仕様 2）', () => {
  it('中心の点は表示の中央（384, 384）に出る', () => {
    expect(VIEW_PX).toBe(768)
    expect(worldToScreen(KOTO, KOTO, 15)).toEqual({ x: 384, y: 384 })
  })

  it('表示の左上のワールド座標は、中心のワールド座標から 384 px 引いた位置', () => {
    const w = worldPixel(KOTO, 15)
    const o = viewOrigin(KOTO, 15)
    expect(o.x).toBeCloseTo(w.x - 384, 6)
    expect(o.y).toBeCloseTo(w.y - 384, 6)
  })
})

describe('表示を覆うタイル（仕様 3）', () => {
  const centers = [KOTO, { lon: 139.9999, lat: 35.1 }, { lon: 0.5, lat: -30 }]
  for (const c of centers) {
    for (const z of [0, 15, 18]) {
      it(`中心 ${c.lon},${c.lat} ズーム ${z}: 表示の全体を覆い、画面上の位置を出す`, () => {
        const tiles = tilesInView(c, z)
        // 表示の全体（横の端から端まで）を、どのタイルかが覆う
        for (const sx of [0, 1, 127, 255, 256, 383, 384, 500, 767]) {
          expect(tiles.some((t) => sx >= t.dx && sx < t.dx + 256)).toBe(true)
        }
        for (const sy of [0, 1, 127, 255, 256, 383, 384, 500, 767]) {
          expect(tiles.some((t) => sy >= t.dy && sy < t.dy + 256)).toBe(true)
        }
        // 1 辺に 4 枚を超えて並ばない（768 px と 256 px の関係）
        expect(tiles.length).toBeLessThanOrEqual(16)
      })
    }
  }

  it('タイルの番号は、画面上の位置と整合する（同じ点は同じタイルに入る）', () => {
    const o = viewOrigin(KOTO, 15)
    const tiles = tilesInView(KOTO, 15)
    const w = worldPixel(KOTO, 15)
    const hit = tiles.find((t) => w.x >= t.x * 256 && w.x < t.x * 256 + 256 && w.y >= t.y * 256 && w.y < t.y * 256 + 256)
    expect(hit).toBeDefined()
    expect(hit!.dx).toBeCloseTo(hit!.x * 256 - o.x, 6)
    expect(hit!.dy).toBeCloseTo(hit!.y * 256 - o.y, 6)
  })
})

describe('タイルの番号を地図の範囲に直す（仕様 3 の続き）', () => {
  it('横は世界の端で繋がる（wrap）', () => {
    // ズーム 1 は横 2 列。-1 は左隣の列（列 1）、2 は右隣の列（列 0）
    expect(tileOnMap({ x: -1, y: 0 }, 1)).toEqual({ x: 1, y: 0 })
    expect(tileOnMap({ x: 2, y: 0 }, 1)).toEqual({ x: 0, y: 0 })
    expect(tileOnMap({ x: 1, y: 1 }, 1)).toEqual({ x: 1, y: 1 })
  })

  it('縦は範囲の外なら null（描かない）', () => {
    expect(tileOnMap({ x: 0, y: -1 }, 1)).toBeNull()
    expect(tileOnMap({ x: 0, y: 2 }, 1)).toBeNull()
  })
})

describe('画面の点と経緯度（仕様 4）', () => {
  it('表示の中央は中心の経緯度に戻る', () => {
    const p = screenToLonLat(384, 384, KOTO, 15)
    expect(p.lon).toBeCloseTo(KOTO.lon, 6)
    expect(p.lat).toBeCloseTo(KOTO.lat, 6)
  })

  it('画面の点 → 経緯度 → 画面の点 で元に戻る', () => {
    for (const [x, y] of [
      [100, 600],
      [700, 50],
    ] as const) {
      const back = worldToScreen(screenToLonLat(x, y, KOTO, 15), KOTO, 15)
      expect(back.x).toBeCloseTo(x, 3)
      expect(back.y).toBeCloseTo(y, 3)
    }
  })

  it('経緯度 → ワールド座標 → 経緯度 で元に戻る（逆変換）', () => {
    for (const z of [0, 18]) {
      const back = lonLatFromWorldPixel(worldPixel(KOTO, z), z)
      expect(back.lon).toBeCloseTo(KOTO.lon, 6)
      expect(back.lat).toBeCloseTo(KOTO.lat, 6)
    }
  })
})

describe('パン（仕様 5）', () => {
  it('右へドラッグすると中心は西へ動く（地図の内容が右へ動く）', () => {
    expect(panCenter(KOTO, 15, 100, 0).lon).toBeLessThan(KOTO.lon)
  })

  it('下へドラッグすると中心は北へ動く', () => {
    expect(panCenter(KOTO, 15, 0, 100).lat).toBeGreaterThan(KOTO.lat)
  })

  it('緯度は Web メルカトルの範囲、経度は ±180 に収める', () => {
    const north = panCenter({ lon: 0, lat: 80 }, 2, 0, -1e6)
    expect(north.lat).toBeLessThanOrEqual(MAX_LAT)
    const east = panCenter({ lon: 179.9, lat: 0 }, 0, -1e6, 0)
    expect(east.lon).toBeLessThanOrEqual(180)
  })
})

describe('クリックとドラッグの区別（仕様 6）', () => {
  it('動きが 4 px 未満ならクリック', () => {
    expect(isClick({ x: 10, y: 10 }, { x: 12, y: 11 })).toBe(true)
  })

  it('動きが 4 px 以上ならドラッグ（4 px ちょうどはドラッグ）', () => {
    expect(isClick({ x: 10, y: 10 }, { x: 20, y: 10 })).toBe(false)
    expect(isClick({ x: 10, y: 10 }, { x: 14, y: 10 })).toBe(false)
  })
})

describe('経緯度の入力（仕様 7）', () => {
  it('数の入力は経緯度にする', () => {
    expect(parseSitePoint('139.814', '35.67')).toEqual({ lon: 139.814, lat: 35.67 })
  })

  it('空・数でない・範囲外は null', () => {
    expect(parseSitePoint('', '35.67')).toBeNull()
    expect(parseSitePoint('139.8', '')).toBeNull()
    expect(parseSitePoint('abc', '35')).toBeNull()
    expect(parseSitePoint('200', '35')).toBeNull()
    expect(parseSitePoint('139', '91')).toBeNull()
  })
})

describe('同じ入力には同じ出力（仕様 8）', () => {
  it('タイルとパンは、同じ入力で同じ結果になる', () => {
    expect(tilesInView(KOTO, 15)).toEqual(tilesInView(KOTO, 15))
    expect(panCenter(KOTO, 15, 30, -20)).toEqual(panCenter(KOTO, 15, 30, -20))
  })
})
