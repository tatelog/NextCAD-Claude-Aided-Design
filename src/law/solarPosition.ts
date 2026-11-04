// 太陽の位置（D-04 P2「日射・日影の条件」、A-03 G53）。国立天文台の簡易式（赤緯・均時差・時角）。決定論。
// 方位は南を 0°、西回りが正。
// 日影の時刻は真太陽時で数える（法56条の2 第1項、一次資料 E-47、t26）。太陽の位置は真太陽時と日付だけで決まる。
const DEG = Math.PI / 180

// 年内の通し日（1月1日 = 1）。UTC の年月日で数える
function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1)
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  return Math.floor((day - start) / 86_400_000) + 1
}

// 均時差（時）。真太陽時 = 平均太陽時 + 均時差
function equationOfTimeHours(n: number): number {
  const B = ((360 / 365) * (n - 81)) * DEG
  const eotMin = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B)
  return eotMin / 60
}

function sunFrom(lat: number, n: number, apparentHours: number): { altitudeDeg: number; azimuthFromSouthDeg: number } {
  const decl = -23.44 * Math.cos((360 / 365) * (n + 10) * DEG) * DEG
  const H = 15 * (apparentHours - 12) * DEG
  const phi = lat * DEG
  const sinAlt = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(H)
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt)))
  const azimuth = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi))
  return { altitudeDeg: altitude / DEG, azimuthFromSouthDeg: azimuth / DEG }
}

// 真太陽時 apparentHours（0〜24 時）の太陽。date の年月日で赤緯を決める
export function sunAtApparentHours(input: { lat: number; date: Date; apparentHours: number }): {
  altitudeDeg: number
  azimuthFromSouthDeg: number
} {
  return sunFrom(input.lat, dayOfYear(input.date), input.apparentHours)
}

// 日付・時刻（UTC）と経度から太陽の位置。真太陽時 = 世界時 + 経度/15 + 均時差
export function solarPosition(input: { lat: number; lon: number; date: Date }): { altitudeDeg: number; azimuthFromSouthDeg: number } {
  const { lat, lon, date } = input
  const n = dayOfYear(date)
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  const apparentHours = utcHours + lon / 15 + equationOfTimeHours(n)
  return sunFrom(lat, n, apparentHours)
}
