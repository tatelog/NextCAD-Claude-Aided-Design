/** MapLibre のズームは1段階ごとに長さの倍率が2倍になる。 */
export function relativeMapMagnification(zoom: number, initialZoom: number): number {
  return 2 ** (zoom - initialZoom)
}
