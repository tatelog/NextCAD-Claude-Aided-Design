// 左のオブジェクト一覧の既定の開閉と、利用者の開閉（ハブ A-03 G55）。描画（システム）のモードと 3D は、折りたたんだ状態で始める。
// 開閉は、どのモードでもできる（ObjectMenu の開閉のボタン）。利用者が開閉したら、その文脈（画面・モード・表示）の間だけ覚える。
import { useState } from 'react'

export function objectMenuFoldedByDefault(mode: string, view: 'plan' | '3d'): boolean {
  return view === '3d' || mode === 'system'
}

/** 利用者が開閉した値と、その文脈（画面・モード・表示を続けた文字） */
export interface FoldOverride {
  context: string
  folded: boolean
}

/** いまの開閉。上書きの文脈が今と同じなら上書きの値、違えば既定（文脈が変わったら既定に戻る） */
export function foldedNowOf(override: FoldOverride | null, context: string, defaultFolded: boolean): boolean {
  return override !== null && override.context === context ? override.folded : defaultFolded
}

/** 呼び出し側の開閉の状態。folded と、押したときに反転する toggle を返す */
export function useObjectMenuFold(context: string, defaultFolded: boolean): { folded: boolean; toggle: () => void } {
  const [override, setOverride] = useState<FoldOverride | null>(null)
  const folded = foldedNowOf(override, context, defaultFolded)
  return { folded, toggle: () => setOverride({ context, folded: !folded }) }
}
