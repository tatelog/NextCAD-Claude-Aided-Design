// P4 の次へ進む条件（ハブ D-04 P4 積算「次へ進む条件: 工事原価が出ている」）。決定論。
// 工事原価が無い（null・未定）か、エラーで出ていないときは、次へ進めない。
/** 工事原価（概算）が出ているか。出ていれば次へ進める */
export function p4CanGoNext(estimate: object | null | undefined): boolean {
  return estimate != null && !('error' in estimate)
}
