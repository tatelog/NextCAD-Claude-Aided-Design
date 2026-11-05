// 仕様（統括の依頼 2026-11-05「removeChild のエラー」。3D の離れの寸法の表記を、drei の Html から外す）:
// 表記は 3D の点を画面の位置に写して、DOM の重ね（Canvas の外）に置く。
// 仕様 1（中央）: 視線の先の点は、画面の中央に写る。
// 仕様 2（向き）: +x の点は中央より右、+y の点は中央より上に写る（y は下向きが正）。
// 仕様 3（後ろ）: カメラの後ろの点は null（表記を出さない）。
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { screenPointOf } from './setbackLabelScreen'

const SIZE = { width: 800, height: 600 }

function camera(): THREE.PerspectiveCamera {
  const c = new THREE.PerspectiveCamera(40, SIZE.width / SIZE.height, 0.1, 1000)
  c.position.set(0, 0, 10)
  c.lookAt(0, 0, 0)
  c.updateMatrixWorld()
  return c
}

describe('3D の表記の画面の位置（仕様 1〜3）', () => {
  it('仕様 1: 視線の先の点は画面の中央に写る', () => {
    const p = screenPointOf([0, 0, 0], camera(), SIZE)
    expect(p).not.toBeNull()
    expect(p!.x).toBeCloseTo(400, 3)
    expect(p!.y).toBeCloseTo(300, 3)
  })

  it('仕様 2: +x は中央より右、+y は中央より上（y は下向きが正）', () => {
    const right = screenPointOf([1, 0, 0], camera(), SIZE)!
    expect(right.x).toBeGreaterThan(400)
    const up = screenPointOf([0, 1, 0], camera(), SIZE)!
    expect(up.y).toBeLessThan(300)
  })

  it('仕様 3: カメラの後ろの点は null（表記を出さない）', () => {
    expect(screenPointOf([0, 0, 20], camera(), SIZE)).toBeNull()
  })
})
