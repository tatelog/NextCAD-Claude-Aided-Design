// 仕様（統括の判断 2026-11-06。3D の鏡像の直し、方針 A）: 平面（mm。x は東、y は北）と 3D（three。m。y は上）の対応は、sceneSpace.ts の一か所だけで決める。
// 仕様 S1: 東（平面の +x）は three の +x。高さは three の y（m）。
// 仕様 S2: 北（平面の +y）は three の −z。南は +z。
// 仕様 S3: 東の点は、南から北を見るカメラで、画面の右に出る（右手系が平面と同じ向き）。
// 仕様 S4: 北の点は、上の少し南から見下ろすカメラで、画面の上に出る。
// 仕様 S5: 冬至の正午（太陽は南の高さ 30.7°）、建物の影は北へ伸びる（three では z が小さい側）。
// 仕様 S6: 3D の点を平面に戻すと、元の平面の点に戻る（つまみのドラッグが、この逆を使う）。
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { planeMmToScene, sceneToPlaneMm } from './sceneSpace'
import { shadowOf } from './shadow'

const SQUARE = [
  { x: 0, y: 0 },
  { x: 10_000, y: 0 },
  { x: 10_000, y: 10_000 },
  { x: 0, y: 10_000 },
]

// 画面上の位置（正規化されたデバイス座標。右が +x、上が +y）
function screenOf(camera: THREE.PerspectiveCamera, p: [number, number, number]): THREE.Vector3 {
  camera.updateMatrixWorld(true)
  return new THREE.Vector3(...p).project(camera)
}

describe('平面と 3D の対応（仕様 S1・S2）', () => {
  it('仕様 S1: 東（+x）は three の +x。高さは three の y（m）', () => {
    expect(planeMmToScene(1000, 0, 2000)).toEqual([1, 2, 0])
  })

  it('仕様 S2: 北（+y）は three の −z、南（−y）は +z', () => {
    expect(planeMmToScene(0, 1000, 0)).toEqual([0, 0, -1])
    expect(planeMmToScene(0, -1000, 0)).toEqual([0, 0, 1])
  })
})

describe('画面の向き（仕様 S3・S4）', () => {
  it('仕様 S3: 東の点は、南から北を見るカメラで、画面の右に出る', () => {
    const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 1000)
    cam.position.set(0, 0, 50)
    cam.lookAt(0, 0, 0)
    expect(screenOf(cam, planeMmToScene(10_000, 0, 0)).x).toBeGreaterThan(0)
    expect(screenOf(cam, planeMmToScene(-10_000, 0, 0)).x).toBeLessThan(0)
  })

  it('仕様 S4: 北の点は、上から南寄りに見下ろすカメラで、画面の上に出る', () => {
    const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 1000)
    cam.position.set(0, 50, 10)
    cam.lookAt(0, 0, 0)
    expect(screenOf(cam, planeMmToScene(0, 10_000, 0)).y).toBeGreaterThan(0)
    expect(screenOf(cam, planeMmToScene(0, -10_000, 0)).y).toBeLessThan(0)
  })
})

describe('影の向き（仕様 S5）', () => {
  it('仕様 S5: 冬至の正午（南の高さ 30.7°）の影は北へ伸びる（three では z が小さい側）', () => {
    const shadow = shadowOf(SQUARE, 15_000, 30.7, 0)
    const mean = (pts: { x: number; y: number }[]) => pts.reduce((s, p) => s + p.y, 0) / pts.length
    expect(mean(shadow)).toBeGreaterThan(mean(SQUARE))
    const shadowZ = shadow.map((p) => planeMmToScene(p.x, p.y, 0)[2])
    const footZ = SQUARE.map((p) => planeMmToScene(p.x, p.y, 0)[2])
    expect(shadowZ.reduce((s, v) => s + v, 0) / shadowZ.length).toBeLessThan(footZ.reduce((s, v) => s + v, 0) / footZ.length)
  })
})

describe('逆の対応（仕様 S6）', () => {
  it('仕様 S6: 3D の点を平面に戻すと、元の平面の点に戻る', () => {
    const [sx, , sz] = planeMmToScene(1234, -5678, 0)
    const back = sceneToPlaneMm(sx, sz)
    expect(back.x).toBeCloseTo(1234, 6)
    expect(back.y).toBeCloseTo(-5678, 6)
  })
})
