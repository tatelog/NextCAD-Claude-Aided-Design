// 仕様（統括の依頼 2026-11-06。5a の確かめの土台。開発用の seed（?seed=square））:
// 仕様 SD1: 外形の四隅（線の端点を mm に直したもの）は、ダミーの筆界の四隅（DUMMY_PARCEL: x 0〜20,000、y 0〜30,000 mm）と一致する。外形はダミーの筆界の中にある。
// 仕様 SD2: 外形の線は 4 本で、端点どうしが繋がって閉じる。
import { describe, expect, it } from 'vitest'
import { strokePointToMm } from '../canvas/strokeToSegments'
import { DUMMY_PARCEL } from '../plan/dummyParcel'
import { devSeedSquareStrokes } from './devSeed'

describe('開発用の seed の外形（仕様 SD1・SD2）', () => {
  const strokes = devSeedSquareStrokes()

  it('仕様 SD1: 外形の四隅は、ダミーの筆界の四隅と一致する（y は負にならない）', () => {
    const corners = strokes.map((s) => strokePointToMm(s, s.points[0]!))
    for (const d of DUMMY_PARCEL) expect(corners).toContainEqual(d)
    expect(corners.every((c) => c.x >= 0 && c.x <= 20_000 && c.y >= 0 && c.y <= 30_000)).toBe(true)
  })

  it('仕様 SD2: 線は 4 本で、端点どうしが繋がって閉じる', () => {
    expect(strokes).toHaveLength(4)
    for (let i = 0; i < 4; i++) {
      const end = strokes[i]!.points[1]!
      const nextStart = strokes[(i + 1) % 4]!.points[0]!
      expect(end.px).toBe(nextStart.px)
      expect(end.py).toBe(nextStart.py)
    }
  })
})
