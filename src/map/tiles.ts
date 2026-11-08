// P1 敷地の地図で使う、経緯度 → タイル番号（Web メルカトルの標準式）。
// 地図の表示は MapLibre（src/map/basemap.ts・src/ui/P1Map.tsx）が行う。ここは番号の計算だけ。
import { z } from 'zod'

const MAX_LAT = 85.05112878

const LonLatSchema = z.object({
  lon: z.number().min(-180).max(180),
  lat: z.number().min(-MAX_LAT).max(MAX_LAT),
})

const ZoomSchema = z.number().int().min(0).max(18)

export interface TileIndex {
  x: number
  y: number
}

export function tileFromLonLat(point: { lon: number; lat: number }, zoom: number): TileIndex {
  const p = LonLatSchema.parse(point)
  const z = ZoomSchema.parse(zoom)
  const n = 2 ** z
  const x = Math.floor(((p.lon + 180) / 360) * n)
  const latRad = (p.lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return { x, y }
}
