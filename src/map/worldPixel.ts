// 経緯度 → Web メルカトルのワールド座標（ピクセル、1 タイル = 256 px）。P1 の地図に図形を重ねるときに使う。
// タイル番号は tileFromLonLat（tiles.ts）と同じ式。ここは小数のまま返す。
export function worldPixel(point: { lon: number; lat: number }, zoom: number): { x: number; y: number } {
  const n = 2 ** zoom * 256
  const x = ((point.lon + 180) / 360) * n
  const latRad = (point.lat * Math.PI) / 180
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  return { x, y }
}

// ワールド座標（ピクセル）→ 経緯度。worldPixel の逆
export function lonLatFromWorldPixel(p: { x: number; y: number }, zoom: number): { lon: number; lat: number } {
  const n = 2 ** zoom * 256
  const lon = (p.x / n) * 360 - 180
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * p.y) / n))) * 180) / Math.PI
  return { lon, lat }
}
