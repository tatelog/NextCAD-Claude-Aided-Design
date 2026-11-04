// 道具の置き場（上・左・独立）を、端末ごとに覚える（ハブ A-03 G52）。保存先は localStorage。案件ファイルには入れない。
// localStorage が使えない端末（例外を出す・無い環境）では、覚えずに「上」で動く。
import type { ToolbarPlacement } from '../store/ui'

export const TOOLBAR_PLACEMENT_KEY = 'toolbar-placement'

const PLACEMENTS: readonly ToolbarPlacement[] = ['top', 'left', 'free']

/** 保存された文字から置き場を読む。上・左・独立のどれでもなければ「上」 */
export function placementOf(raw: string | null): ToolbarPlacement {
  return PLACEMENTS.find((p) => p === raw) ?? 'top'
}

/** この端末に覚えた置き場。使えなければ「上」 */
export function loadToolbarPlacement(): ToolbarPlacement {
  try {
    return placementOf(localStorage.getItem(TOOLBAR_PLACEMENT_KEY))
  } catch {
    return 'top'
  }
}

/** この端末に置き場を覚える。使えなければ覚えないだけ（画面の置き場は変わる） */
export function saveToolbarPlacement(p: ToolbarPlacement): void {
  try {
    localStorage.setItem(TOOLBAR_PLACEMENT_KEY, p)
  } catch {
    // 覚えられない端末では、置き場は今の画面だけ
  }
}
