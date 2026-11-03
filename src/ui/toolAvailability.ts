// 道具が使える画面（ハブ A-03 G69、D-04 P2・P3）。描画にも状態にも依存しない純粋な処理。
import type { TOOL_ICONS } from './toolIcons'

export type ToolName = keyof typeof TOOL_ICONS
export type Screen = 'P1' | 'P2' | 'P3' | 'P4' | 'P5'

// 使える画面を限る道具。什器は P3 で使う（P2 ではグレーアウト）。ここに無い道具は、どの画面でも使える。
const ONLY_ON: Partial<Record<ToolName, readonly Screen[]>> = {
  fixture: ['P3'],
}

export function isToolEnabled(tool: ToolName, screen: Screen): boolean {
  const only = ONLY_ON[tool]
  return only === undefined || only.includes(screen)
}
