// 経緯度から 3 次メッシュ番号（8 桁）を求める（日本の標準地域メッシュ）。PLATEAU の建物ファイルの名前と同じ形。
// 3 次 = 2 次メッシュ（6 桁）の後ろに、緯度方向の位置（30 秒刻みの 0〜9）、経度方向の位置（45 秒刻みの 0〜9）を 1 桁ずつ続ける。
import { meshCode2nd } from './mesh'

export function meshCode3rd(point: { lat: number; lon: number }): string {
  const secondary = meshCode2nd(point)
  // 緯度 1 度 = 120 個の 30 秒。2 次メッシュの高さ（5 分）は 10 個分なので、末尾 1 桁が 2 次の中での位置になる
  const latDigit = Math.floor(point.lat * 120) % 10
  // 経度 1 度 = 80 個の 45 秒。2 次メッシュの幅（7.5 分）は 10 個分
  const lonDigit = Math.floor(point.lon * 80) % 10
  return `${secondary}${latDigit}${lonDigit}`
}
