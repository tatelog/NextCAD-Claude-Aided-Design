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
}

export interface SaveData {
  projectName: string
  savedAt: string
  entries: readonly unknown[]
  storeyCount: number
  storeyHeightMm: number
  /** P3 で置いた什器の一覧（置いた順。id・品目・区画の id）。什器が無いときは項目ごと無い */
  fixtures?: readonly Fixture[]
}

export function buildSaveData(input: SaveInput): SaveData {
  const name = input.projectName.trim()
  // 保存のデータは元の一覧と別物にする（保存のあとで店舗の一覧が変わっても変わらない）
  const fixtures = (input.fixtures ?? []).map((f) => ({ id: f.id, item: f.item, unitId: f.unitId }))
  return {
    projectName: name === '' ? '敷地名（案件）未入力' : name,
    savedAt: input.savedAt.toISOString(),
    entries: input.entries,
    storeyCount: input.storeyCount,
    storeyHeightMm: input.storeyHeightMm,
    ...(fixtures.length > 0 ? { fixtures } : {}),
  }
}
