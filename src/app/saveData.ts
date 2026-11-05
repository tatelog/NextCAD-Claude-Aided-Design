// 案件の保存（JSON）。モックのヘッダーの「保存」。Google ドライブへの保存はまだつながない。
// 周辺建物（PLATEAU）の生データは含めない（外部データを同梱しない。実行時に取り直す）。
// 什器（G69。仮置き）: P3 で置いた什器の一覧を fixtures として含める。什器が無いときは項目ごと付けない（今までと同じ形）。読み込みはまだ無い。
import type { Fixture } from '../plan/fixtures'

export interface SaveInput {
  projectName: string
  entries: readonly unknown[]
  storeyCount: number
  storeyHeightMm: number
  savedAt: Date
  /** P3 で置いた什器の一覧（店舗の fixtures）。省略・空なら、保存のデータに fixtures の項目を付けない */
  fixtures?: readonly Fixture[]
  /** 利用者が P4 で入れた単価（品目ごとの入力の文字）。空の入力は保存しない（G20・G72） */
  unitPriceTexts?: Readonly<Record<string, string>>
  /** 区画に付けた 1F の名前（区画の id → 名前）。無ければ項目ごと付けない（G75） */
  firstFloorNames?: Readonly<Record<string, string>>
}

export interface SaveData {
  projectName: string
  savedAt: string
  entries: readonly unknown[]
  storeyCount: number
  storeyHeightMm: number
  /** P3 で置いた什器の一覧（置いた順。id・品目・区画の id）。什器が無いときは項目ごと無い */
  fixtures?: readonly Fixture[]
  /** 利用者が入れた単価の入力（空の入力は保存しない） */
  unitPriceTexts?: Record<string, string>
  /** 区画に付けた 1F の名前（区画の id → 名前） */
  firstFloorNames?: Record<string, string>
}

export function buildSaveData(input: SaveInput): SaveData {
  const name = input.projectName.trim()
  // 保存のデータは元の一覧と別物にする（保存のあとで店舗の一覧が変わっても変わらない）
  const fixtures = (input.fixtures ?? []).map((f) => ({ id: f.id, item: f.item, unitId: f.unitId }))
  const unitPriceTexts = Object.fromEntries(Object.entries(input.unitPriceTexts ?? {}).filter(([, text]) => text !== ''))
  return {
    projectName: name === '' ? '敷地名（案件）未入力' : name,
    savedAt: input.savedAt.toISOString(),
    entries: input.entries,
    storeyCount: input.storeyCount,
    storeyHeightMm: input.storeyHeightMm,
    ...(fixtures.length > 0 ? { fixtures } : {}),
    ...(Object.keys(unitPriceTexts).length > 0 ? { unitPriceTexts } : {}),
    ...(input.firstFloorNames && Object.keys(input.firstFloorNames).length > 0 ? { firstFloorNames: { ...input.firstFloorNames } } : {}),
  }
}
