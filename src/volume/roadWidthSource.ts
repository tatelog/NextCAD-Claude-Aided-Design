// 前面道路の幅員の出どころ（ハブ A-03 G16。仮置き）。数値指定・対岸指定・資料指定のどれで入れたかを、値と一緒に持つ。
// 値は利用者が入れる（測った値を自動で採らない）。対岸の寸法や資料の中身は読まない。
export const ROAD_WIDTH_SOURCES = ['数値指定', '対岸指定', '資料指定'] as const

export type RoadWidthSource = (typeof ROAD_WIDTH_SOURCES)[number]

export const DEFAULT_ROAD_WIDTH_SOURCE: RoadWidthSource = '数値指定'

/** 注記（出どころ（幅員 m））。幅員は m で一桁まで */
export function roadWidthNote(source: RoadWidthSource, widthMm: number): string {
  return `${source}（${(widthMm / 1000).toFixed(1)} m）`
}
