// 道路の描き方。幅員区分（国土数値情報 N13 の幅員区分コード 1〜5）ごとに、色と太さを決める。
// 太さは、ズーム 13 以下で通常の半分、ズーム 17 以上で通常どおり、その間は直線で変える。
export const ROAD_WIDTH_CLASSES = [
  { k: 1, label: '3m未満', color: '#c7d2d9', px: 1.4 },
  { k: 2, label: '3m〜5.5m未満', color: '#7f9cb0', px: 2 },
  { k: 3, label: '5.5m〜13m未満', color: '#e07b39', px: 3 },
  { k: 4, label: '13m〜19.5m未満', color: '#c2432b', px: 5 },
  { k: 5, label: '19.5m以上', color: '#7a1f1f', px: 7 },
] as const

export function roadWidthPx(k: number, zoom: number): number {
  const c = ROAD_WIDTH_CLASSES.find((x) => x.k === k)
  if (!c) throw new Error(`幅員区分 ${k} は 1〜5 の外`)
  const t = Math.min(1, Math.max(0, (zoom - 13) / 4))
  return c.px * (0.5 + 0.5 * t)
}
