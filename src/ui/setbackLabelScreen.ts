// 3D の表記（離れの寸法）を、画面の位置に写す（統括の依頼 2026-11-05「removeChild のエラー」）。
// drei の Html は、Canvas の外れるときに別の React の根を外して、DOM を二重に外す（removeChild が失敗する）。
// そこで表記は DOM の重ねとして React が持ち、位置だけをこの関数で写す。決定論。
import * as THREE from 'three'

/** 3D の点を、画面の位置（CSS の px。左上が原点、y は下向きが正）にする。カメラの後ろは null（表記を出さない） */
export function screenPointOf(
  world: readonly [number, number, number],
  camera: THREE.PerspectiveCamera,
  size: { width: number; height: number },
): { x: number; y: number } | null {
  const v = new THREE.Vector3(...world).applyMatrix4(camera.matrixWorldInverse)
  // カメラは -z を向くので、視点の座標で z が近面より手前（大きい）なら後ろ
  if (v.z > -camera.near) return null
  v.applyMatrix4(camera.projectionMatrix)
  return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height }
}
