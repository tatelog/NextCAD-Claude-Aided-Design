// P1 の地図の入力の検査（D-04 P1）。拡大縮小の範囲、経緯度の入力を地点にする処理、地図の範囲（緯度 ±85.05°、ズーム 0〜18）。
// 地図の表示・パン・ズーム・クリックは MapLibre（src/ui/P1Map.tsx）が行う。ここは値の検査だけ。決定論。
const MAX_LAT = 85.05112878

export const MAX_ZOOM = 18

export interface LonLat {
  lon: number
  lat: number
}

export function clampZoom(z: number): number {
  if (!Number.isFinite(z)) return 0
  return Math.min(MAX_ZOOM, Math.max(0, Math.floor(z)))
}

/** 経緯度の入力を地点にする。空・数でない・範囲外は null */
export function parseSitePoint(lonText: string, latText: string): LonLat | null {
  if (lonText.trim() === '' || latText.trim() === '') return null
  const lon = Number(lonText)
  const lat = Number(latText)
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null
  if (lon < -180 || lon > 180 || lat < -MAX_LAT || lat > MAX_LAT) return null
  return { lon, lat }
}
