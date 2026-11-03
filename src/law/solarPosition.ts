// 太陽の位置（D-04 P2「日射・日影の条件」、A-03 G53）。国立天文台の簡易式（赤緯・均時差・時角）。決定論。
// 時刻は Date（UTC）で受け、日本時間の正午は 03:00Z。方位は南を 0°、西回りが正。
const DEG = Math.PI / 180

export function solarPosition(input: { lat: number; lon: number; date: Date }): { altitudeDeg: number; azimuthFromSouthDeg: number } {
  const { lat, lon, date } = input
  const start = Date.UTC(date.getUTCFullYear(), 0, 1)
  const n = Math.floor((date.getTime() - start) / 86_400_000) + 1
  // 太陽赤緯（度）
  const decl = -23.44 * Math.cos((360 / 365) * (n + 10) * DEG)
  // 均時差（分）
  const B = ((360 / 365) * (n - 81)) * DEG
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B)
  // 真太陽時（時）。標準子午線は 135°E（日本時間）
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  const localHours = (utcHours + 9) % 24
  const solarHours = localHours + (4 * (lon - 135) + eot) / 60
  const H = 15 * (solarHours - 12) * DEG
  const phi = lat * DEG
  const d = decl * DEG
  const sinAlt = Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(H)
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt)))
  const azimuth = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(d) * Math.cos(phi))
  return { altitudeDeg: altitude / DEG, azimuthFromSouthDeg: azimuth / DEG }
}
