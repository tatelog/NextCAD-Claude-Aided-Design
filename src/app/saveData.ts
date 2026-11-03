// 案件の保存（JSON）。モックのヘッダーの「保存」。Google ドライブへの保存はまだつながない。
// 周辺建物（PLATEAU）の生データは含めない（外部データを同梱しない。実行時に取り直す）。
export interface SaveInput {
  projectName: string
  entries: readonly unknown[]
  storeyCount: number
  storeyHeightMm: number
  savedAt: Date
}

export interface SaveData {
  projectName: string
  savedAt: string
  entries: readonly unknown[]
  storeyCount: number
  storeyHeightMm: number
}

export function buildSaveData(input: SaveInput): SaveData {
  const name = input.projectName.trim()
  return {
    projectName: name === '' ? '敷地名（案件）未入力' : name,
    savedAt: input.savedAt.toISOString(),
    entries: input.entries,
    storeyCount: input.storeyCount,
    storeyHeightMm: input.storeyHeightMm,
  }
}
