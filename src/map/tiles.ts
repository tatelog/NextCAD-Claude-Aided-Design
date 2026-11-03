// P1 敷地の地図（D-04 P1、D-02 C4、AGENTS.md）。国土地理院の標準地図タイルを実行時に読む（同梱しない）。
// 経緯度 → タイル番号は Web メルカトルの標準式。OpenStreetMap の公式タイルは使わない（AGENTS.md）。
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

// 国土地理院の標準地図（xyz/std）。画像そのものは同梱しない。
export function tileUrl(tile: TileIndex, zoom: number): string {
  const z = ZoomSchema.parse(zoom)
  return `https://cyberjapandata.gsi.go.jp/xyz/std/${z}/${tile.x}/${tile.y}.png`
}

// 画面に必ず出す出典（A-04 の出典表示必須）。
export const ATTRIBUTION = '出典: 国土地理院（地理院タイル）'
