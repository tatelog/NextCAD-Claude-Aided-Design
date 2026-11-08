// 日射・日影の計算に使う地点（統括の依頼 2026-11-06。3）。確定した敷地の中心を使う。確定していなければ、今までどおりの固定の地点（江東区の点）。決定論。

/** 確定していないときの地点（今までどおり。35.67N, 139.86E） */
export const FIXED_SUN_SITE = { lat: 35.67, lon: 139.86 }

/** 日射・日影の地点。確定した敷地の中心があればそれ、無ければ固定の地点 */
export function sunSiteOf(center: { lat: number; lon: number } | null): { lat: number; lon: number } {
  return center ?? FIXED_SUN_SITE
}
