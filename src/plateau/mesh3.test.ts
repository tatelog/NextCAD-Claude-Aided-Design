// 仕様: 経緯度から 3 次メッシュ番号（8 桁）を求める。2 次メッシュを縦横 10 分割したもの（日本の標準地域メッシュ）。
// PLATEAU の建物（bldg）は 3 次メッシュごとのファイルで、zip の中の名前に入る（udx/bldg/53394608_bldg_6697_op.gml）。
// 仕様 1: 3 次メッシュ = 2 次メッシュ（6 桁）＋ 緯度方向の数字（0〜9）＋ 経度方向の数字（0〜9）。
//   緯度方向は 2 次の高さ（5 分）の 1/10（30 秒）、経度方向は 2 次の幅（7.5 分）の 1/10（45 秒）。
// 仕様 2: 江東区の点（35.673094N, 139.860149E）は 53394608。
// 仕様 3: 2 次メッシュの先頭 6 桁は、2 次メッシュ関数の結果と一致する。
import { describe, expect, it } from 'vitest'
import { meshCode3rd } from './mesh3'
import { meshCode2nd } from './mesh'

describe('meshCode3rd（3 次メッシュ）', () => {
  it('江東区の点は 53394608', () => {
    expect(meshCode3rd({ lat: 35.673094, lon: 139.860149 })).toBe('53394608')
  })

  it('先頭 6 桁は 2 次メッシュと一致する', () => {
    const p = { lat: 35.6812, lon: 139.7671 }
    expect(meshCode3rd(p).slice(0, 6)).toBe(meshCode2nd(p))
  })

  it('日本の範囲の外は弾く', () => {
    expect(() => meshCode3rd({ lat: 10, lon: 139 })).toThrow()
  })
})
