// 平面と 3D の対応を、この一か所だけで決める（統括の判断 2026-11-06。3D の鏡像の直し、方針 A）。
// 平面（mm）: x は東、y は北（src/map/parcelPlane.ts）。3D（three。m）: x は東（+x）、y は上、z は南（+z）。北は −z。
// 東を +x にしたまま北を −z にして、右手系を保つ。3D の立体・地面・敷地・寸法線・周辺建物・影・初期視点・キューブ・つまみは、すべてこの関数を通す。

const MM_PER_M = 1000

/** 平面の点（mm）と高さ（mm）を、3D の位置（three の x・y・z。m）にする。−0 は 0 にそろえる */
export function planeMmToScene(x: number, y: number, heightMm: number): [number, number, number] {
  return [x / MM_PER_M + 0, heightMm / MM_PER_M + 0, -y / MM_PER_M + 0]
}

/** 3D の水平の位置（x・z。m）を、平面の点（mm）に戻す。planeMmToScene の逆（高さは含まない） */
export function sceneToPlaneMm(sceneX: number, sceneZ: number): { x: number; y: number } {
  return { x: sceneX * MM_PER_M + 0, y: -sceneZ * MM_PER_M + 0 }
}
