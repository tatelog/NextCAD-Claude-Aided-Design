// 真北（D-02 C4、A-03 G16）。敷地中心から真北へ約 11 m 進めた点を、同じ平面直角座標系へ再投影し、
// その差分の向きからグリッド北に対する角度（度）を出す。決定論。系の定義（proj4 の文字列）は呼び出し側が渡す（系番号は自治体で決まるため、ここでは固定しない）。
import proj4 from 'proj4'

// 緯度 1e-4 度 ≒ 11 m。真北の向きを取るための短い距離（G16）
const STEP_LAT_DEG = 1e-4

export function trueNorthAngleDeg(center: { lon: number; lat: number }, zoneDef: string): number {
  const a = proj4('WGS84', zoneDef, [center.lon, center.lat]) as [number, number]
  const b = proj4('WGS84', zoneDef, [center.lon, center.lat + STEP_LAT_DEG]) as [number, number]
  // グリッド北（+y）から、真北の方向（+x 側へ正）への角度
  return (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180) / Math.PI
}
