// 機能のオンオフの設定を、端末ごとに覚える（ハブ A-03 G70、設計グリルの項目 9）。保存先は localStorage。案件ファイルには入れない。
// 保存が無い・壊れている・使えない端末では、すべて入（既定）で動く。決定論。

export const FEATURE_SETTINGS_KEY = 'feature-settings'

/** 保存の文字から、機能の設定を読む。知らない機能名・真偽でない値・壊れた文字は無視する（無ければ既定 true） */
export function parseFeatureSettings(raw: string | null, keys: readonly string[]): Record<string, boolean> {
  const all = Object.fromEntries(keys.map((k) => [k, true])) as Record<string, boolean>
  if (raw === null) return all
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return all
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return all
  for (const k of keys) {
    const v = (parsed as Record<string, unknown>)[k]
    if (typeof v === 'boolean') all[k] = v
  }
  return all
}

/** この端末に覚えた機能の設定。使えなければ既定（すべて入） */
export function loadFeatureSettings(keys: readonly string[]): Record<string, boolean> {
  try {
    return parseFeatureSettings(localStorage.getItem(FEATURE_SETTINGS_KEY), keys)
  } catch {
    return parseFeatureSettings(null, keys)
  }
}

/** この端末に機能の設定を覚える。使えなければ覚えないだけ（画面の設定は変わる） */
export function saveFeatureSettings(on: Record<string, boolean>): void {
  try {
    localStorage.setItem(FEATURE_SETTINGS_KEY, JSON.stringify(on))
  } catch {
    // 覚えられない端末では、設定は今の画面だけ
  }
}
