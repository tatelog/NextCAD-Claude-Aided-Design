// 保存状態（ハブ D-04 共通ヘッダー「保存状態」）。保存した時点の案件と、いまの案件を、店舗の参照で比べる。
// 参照が同じなら変わっていない（店舗は変更のたびに新しい参照を作るため、中身の比較は要らない）。
export interface SaveSnapshotState {
  entries: unknown
  storeyCount: number
  storeyHeightMm: number
  fixtures: unknown
}

export function saveStatusOf(saved: SaveSnapshotState, current: SaveSnapshotState): '保存済み' | '未保存の変更あり' {
  const same =
    saved.entries === current.entries &&
    saved.storeyCount === current.storeyCount &&
    saved.storeyHeightMm === current.storeyHeightMm &&
    saved.fixtures === current.fixtures
  return same ? '保存済み' : '未保存の変更あり'
}
