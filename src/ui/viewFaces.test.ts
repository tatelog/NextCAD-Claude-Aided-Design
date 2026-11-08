// 仕様: ビューキューブ（D-04 共通部品「3D への切替」、A-03 G51）。3D の右上に、面を押して向きを変える操作を置く。
// 仕様 1: 六面（上・下・正面・背面・左・右）の視点の位置を返す。視点は注視点（原点）から同じ距離。
// 仕様 2: 上は +y、下は −y、正面は +z（南から北を見る向き。北は −z）、背面は −z（北から南を見る向き）、右は +x、左は −x。
// 仕様 3: 距離は 0 より大きい。0 以下は弾く。
import { describe, expect, it } from 'vitest'
import { cameraForFace, FACES } from './viewFaces'

describe('cameraForFace（ビューキューブの六面）', () => {
  it('六面がすべて定義されている', () => {
    expect(FACES).toEqual(['top', 'bottom', 'front', 'back', 'left', 'right'])
  })

  it('各面の視点は、対応する軸の上に、指定の距離で乗る', () => {
    expect(cameraForFace('top', 10)).toEqual({ x: 0, y: 10, z: 0 })
    expect(cameraForFace('bottom', 10)).toEqual({ x: 0, y: -10, z: 0 })
    expect(cameraForFace('front', 10)).toEqual({ x: 0, y: 0, z: 10 })
    expect(cameraForFace('back', 10)).toEqual({ x: 0, y: 0, z: -10 })
    expect(cameraForFace('right', 10)).toEqual({ x: 10, y: 0, z: 0 })
    expect(cameraForFace('left', 10)).toEqual({ x: -10, y: 0, z: 0 })
  })

  it('距離が 0 以下なら弾く', () => {
    expect(() => cameraForFace('top', 0)).toThrow()
    expect(() => cameraForFace('front', -1)).toThrow()
  })
})
