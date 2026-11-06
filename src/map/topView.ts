/** 地点を真上から見る。ズーム+2で初期表示の4倍。 */
export function topViewAt(lon: number, lat: number, initialZoom: number) {
  return { center: [lon, lat] as [number, number], zoom: initialZoom + 2, pitch: 0, bearing: 0 }
}
