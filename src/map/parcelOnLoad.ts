// 地図の読み込みで選ぶ筆（統括の依頼 2026-11-06。1）。筆が既に選ばれていれば、その筆を残す（開き直しで確定した筆を上書きしない）。無ければデモの筆。決定論。

/** 読み込みで選ぶ筆の UID */
export function parcelOnLoadOf(current: string | null, demo: string): string {
  return current ?? demo
}
