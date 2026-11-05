// 斜線制限の規則（建築基準法 第56条第1項・別表第三）。出典は e-Gov 法令 API の本文（2026-11-03 取得）。
// 地方公共団体の条例で別に定める部分（日影・高度地区など）はここに含めない（T-07 の値として呼び出し側が渡す）。
// 容積率は百分率（％）。表の「十分の二十以下」は 200％ 以下。

/** 用途地域の一覧（画面の選択肢に使う） */
export const ZONES = ['低層住専', '田園住居', '中高層住専', '住居系', '商業系', '準工・工業系', '高層住居誘導', '指定なし'] as const

export type Zone = (typeof ZONES)[number]

export type RuleResult<T> = ({ status: '適用' } & T) | { status: '対象外' } | { status: '判定不能' }

// 別表第三: 前面道路の反対側の境界線からの距離（は欄）と係数（に欄）
export function roadSlopeRule(input: { zone: Zone; farPercent: number }): { status: '適用'; distanceMm: number; coefficient: number } | { status: '判定不能' } {
  const f = input.farPercent
  const m = (v: number) => v * 1_000
  switch (input.zone) {
    case '低層住専':
    case '田園住居':
    case '中高層住専':
    case '住居系': {
      // 一の項: 係数 1.25
      const d = f <= 200 ? 20 : f <= 300 ? 25 : f <= 400 ? 30 : 35
      return { status: '適用', distanceMm: m(d), coefficient: 1.25 }
    }
    case '商業系': {
      // 二の項: 係数 1.5
      const d = f <= 400 ? 20 : f <= 600 ? 25 : f <= 800 ? 30 : f <= 1000 ? 35 : f <= 1100 ? 40 : f <= 1200 ? 45 : 50
      return { status: '適用', distanceMm: m(d), coefficient: 1.5 }
    }
    case '準工・工業系': {
      // 三の項: 係数 1.5
      const d = f <= 200 ? 20 : f <= 300 ? 25 : f <= 400 ? 30 : 35
      return { status: '適用', distanceMm: m(d), coefficient: 1.5 }
    }
    case '高層住居誘導':
      // 四の項: 35 m・係数 1.5（住宅の用途に供する部分が延べ面積の 3 分の 2 以上）
      return { status: '適用', distanceMm: m(35), coefficient: 1.5 }
    case '指定なし':
      // 五の項: 係数 1.25 か 1.5 を特定行政庁が定めるので判定できない
      return { status: '判定不能' }
  }
}

// 第56条第1項第3号（北側斜線）。低層住専・田園住居は 5 m、中高層住専は 10 m。係数は 1.25。
export function northSlopeRule(input: { zone: Zone }): RuleResult<{ riseMm: number; coefficient: number }> {
  if (input.zone === '低層住専' || input.zone === '田園住居') return { status: '適用', riseMm: 5_000, coefficient: 1.25 }
  if (input.zone === '中高層住専') return { status: '適用', riseMm: 10_000, coefficient: 1.25 }
  return { status: '対象外' }
}

// 第56条第1項第2号（隣地斜線）。係数 1.25 は高さ 20 m 超、係数 2.5 は高さ 31 m 超に適用。
export function adjacentSlopeRule(input: { zone: Zone }): RuleResult<{ riseMm: number; coefficient: number }> {
  switch (input.zone) {
    case '住居系':
    case '中高層住専':
      return { status: '適用', riseMm: 20_000, coefficient: 1.25 }
    case '商業系':
    case '準工・工業系':
    case '高層住居誘導':
      return { status: '適用', riseMm: 31_000, coefficient: 2.5 }
    case '低層住専':
    case '田園住居':
      return { status: '対象外' }
    case '指定なし':
      return { status: '判定不能' }
  }
}
