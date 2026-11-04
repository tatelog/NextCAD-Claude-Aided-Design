// PLATEAU のコードリストの名前（統括の t68・2026-11-05）。コードの数字だけでは画面で分からないので、名前を添える。
// 区分: Common_districtsAndZonesType（https://www.mlit.go.jp/plateaudocument01-01/Contents/コードリスト/Common_districtsAndZonesType.html を 2026-11-05 に確認）。
// 用途（防火）: FirePreventionDistrict_usage（https://www.geospatial.jp/iur/codelists/3.2/FirePreventionDistrict_usage.xml を 2026-11-05 に確認）。
// ここに無いコードは名前を返さない（推測で埋めない）。画面は数字のまま出す。

const DISTRICTS_AND_ZONES: Readonly<Record<number, string>> = {
  1: '第1種低層住居専用地域',
  2: '第2種低層住居専用地域',
  3: '第1種中高層住居専用地域',
  4: '第2種中高層住居専用地域',
  5: '第1種住居地域',
  6: '第2種住居地域',
  7: '準住居地域',
  8: '田園住居地域',
  9: '近隣商業地域',
  10: '商業地域',
  11: '準工業地域',
  12: '工業地域',
  13: '工業専用地域',
  18: '高度地区',
  24: '防火地域',
  25: '準防火地域',
}

const FIRE_USAGE: Readonly<Record<number, string>> = {
  1: '防火地域（地域）',
  2: '防火地域（路線）',
  3: '準防火地域（地域）',
  4: '準防火地域（路線）',
}

/** 区分コードの名前（用途地域 1〜13、高度地区 18、防火 24、準防火 25）。表に無ければ undefined */
export function districtsAndZonesName(code: number): string | undefined {
  return DISTRICTS_AND_ZONES[code]
}

/** 防火の用途コードの名前（1〜4）。表に無ければ undefined */
export function fireUsageName(usage: number): string | undefined {
  return FIRE_USAGE[usage]
}
