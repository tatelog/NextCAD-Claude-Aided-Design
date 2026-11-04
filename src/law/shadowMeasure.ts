// 東京都日影条例の測定面の高さ（別表第一・別表第四。ハブ A-07 E-87、E-45）。決定論。
// 測定面は、用途地域・容積率・高度地区の区分で決まる（4m か 6.5m）。表に無い組み合わせは決めない（null）。
// 江東区は別表第四 六 で、中高層住専・住居・準住居・準工業の第三種高度地区の測定面を 4m に読み替える。

export type TokyoDistrict = '中高層住専' | '住居・準住居' | '近隣商業' | '準工業'
export type HeightDistrict = '第一種' | '第二種' | '第三種' | '指定なし'
export type FloorAreaRatio = 10 | 15 | 20 | 30

export interface MeasureInput {
  district: TokyoDistrict
  heightDistrict: HeightDistrict
  far: FloorAreaRatio
}

export interface Measurement {
  measurementM: 4 | 6.5
  /** 別表第三・第四の号（一・二） */
  band: '一' | '二'
}

interface Row {
  district: TokyoDistrict
  heightDistrict: HeightDistrict[]
  far: FloorAreaRatio[]
  measurement: Measurement
}

// 別表第一（E-87 の記述を行にした。どの行にも重ならない）
const TABLE: Row[] = [
  { district: '中高層住専', heightDistrict: ['第一種', '第二種'], far: [10, 15, 20, 30], measurement: { measurementM: 4, band: '一' } },
  { district: '中高層住専', heightDistrict: ['第三種'], far: [20, 30], measurement: { measurementM: 6.5, band: '二' } },
  { district: '住居・準住居', heightDistrict: ['第一種', '第二種', '指定なし'], far: [10, 15, 20], measurement: { measurementM: 4, band: '一' } },
  { district: '住居・準住居', heightDistrict: ['第三種'], far: [20], measurement: { measurementM: 6.5, band: '一' } },
  { district: '住居・準住居', heightDistrict: ['第三種'], far: [30], measurement: { measurementM: 6.5, band: '二' } },
  { district: '住居・準住居', heightDistrict: ['指定なし'], far: [30], measurement: { measurementM: 4, band: '二' } },
  { district: '近隣商業', heightDistrict: ['第一種', '第二種'], far: [10, 15, 20, 30], measurement: { measurementM: 4, band: '一' } },
  { district: '近隣商業', heightDistrict: ['第三種'], far: [20], measurement: { measurementM: 6.5, band: '一' } },
  { district: '近隣商業', heightDistrict: ['第三種'], far: [30], measurement: { measurementM: 6.5, band: '二' } },
  { district: '準工業', heightDistrict: ['第一種', '第二種'], far: [10, 15, 20], measurement: { measurementM: 4, band: '一' } },
  { district: '準工業', heightDistrict: ['第二種'], far: [30], measurement: { measurementM: 4, band: '一' } },
  { district: '準工業', heightDistrict: ['第三種'], far: [20], measurement: { measurementM: 6.5, band: '一' } },
  { district: '準工業', heightDistrict: ['第三種'], far: [30], measurement: { measurementM: 6.5, band: '二' } },
  { district: '準工業', heightDistrict: ['指定なし'], far: [20], measurement: { measurementM: 4, band: '二' } },
]

/** 東京都日影条例の別表第一。表に無い組み合わせは null */
export function tokyoMeasurement(input: MeasureInput): Measurement | null {
  const row = TABLE.find(
    (r) => r.district === input.district && r.heightDistrict.includes(input.heightDistrict) && r.far.includes(input.far),
  )
  return row ? { ...row.measurement } : null
}

/** 江東区（別表第四 六）。中高層住専・住居・準住居・準工業の第三種は 4m に読み替える */
export function kotoMeasurement(input: MeasureInput): Measurement | null {
  const base = tokyoMeasurement(input)
  if (base === null) return null
  const replaced = input.heightDistrict === '第三種' && input.district !== '近隣商業'
  return replaced ? { measurementM: 4, band: base.band } : base
}
