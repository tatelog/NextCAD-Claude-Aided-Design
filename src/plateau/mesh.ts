// 経緯度から 2 次メッシュ番号（6 桁）を求める（日本の標準地域メッシュ）。PLATEAU の API の mm: の番号と同じ形。
// 1 次: 緯度 × 1.5 の整数部（2 桁）＋（経度 − 100）の整数部（2 桁）。
// 2 次: 1 次の後ろに、緯度の 1 次内の位置（× 8）、経度の 1 次内の位置（× 8）を 1 桁ずつ続ける。
export function meshCode2nd(point: { lat: number; lon: number }): string {
  const { lat, lon } = point
  if (lat < 20 || lat > 46 || lon < 122 || lon > 154) throw new Error('日本の範囲の外')
  const latX = lat * 1.5
  const lat1 = Math.floor(latX)
  const lon1 = Math.floor(lon)
  const latFrac = Math.floor((latX - lat1) * 8)
  const lonFrac = Math.floor((lon - lon1) * 8)
  return `${lat1}${String(lon1 - 100).padStart(2, '0')}${latFrac}${lonFrac}`
}
