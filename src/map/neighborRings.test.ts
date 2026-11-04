// 仕様（周辺建物の輪郭を地図に重ねる）から書いたテスト。実装を読まずに書いている。
// 仕様:
// - 周辺建物が無い（null）か、表示しない設定のときは、何も重ねない（空の配列）
// - 表示するときは、建物の輪郭（経緯度の点の列）を、[経度, 緯度] の環にして全部並べる
// - 建物 1 件に輪郭が複数あれば、そのすべてを環として出す
import { describe, expect, it } from 'vitest'
import { neighborRings } from './neighborRings'

const BUILDINGS = [
  {
    footprints: [
      [
        { lon: 139.1, lat: 35.1 },
        { lon: 139.2, lat: 35.1 },
        { lon: 139.2, lat: 35.2 },
      ],
    ],
  },
  {
    footprints: [
      [{ lon: 139.3, lat: 35.3 }, { lon: 139.4, lat: 35.3 }, { lon: 139.4, lat: 35.4 }],
      [{ lon: 139.5, lat: 35.5 }, { lon: 139.6, lat: 35.5 }, { lon: 139.6, lat: 35.6 }],
    ],
  },
]

describe('neighborRings', () => {
  it('周辺建物が無いときは、何も重ねない', () => {
    expect(neighborRings(null, true)).toEqual([])
  })

  it('表示しない設定のときは、建物があっても何も重ねない', () => {
    expect(neighborRings(BUILDINGS, false)).toEqual([])
  })

  it('表示するときは、輪郭を [経度, 緯度] の環にして、建物の順に全部並べる', () => {
    expect(neighborRings(BUILDINGS, true)).toEqual([
      [
        [139.1, 35.1],
        [139.2, 35.1],
        [139.2, 35.2],
      ],
      [
        [139.3, 35.3],
        [139.4, 35.3],
        [139.4, 35.4],
      ],
      [
        [139.5, 35.5],
        [139.6, 35.5],
        [139.6, 35.6],
      ],
    ])
  })
})
