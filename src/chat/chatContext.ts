// チャットの文脈（ハブ A-03 G142・G144、統括の依頼 t55）。並びは「固定の部分 → 案件の要約 → 選んだ周辺の抜粋 → 直近の操作」。
// 固定の部分を先頭に置き、呼び出しのキャッシュが効くようにする（G144）。件数は設定値（実測で決める）。決定論。
export const CHAT_RECENT_OPS = 10
export const CHAT_EXCERPT_MAX = 20
/** 案件の要約の文字数の上限（仮置き。実測で決める。G144） */
export const CHAT_MEMORY_MAX_CHARS = 1200

export interface ChatContextInput {
  /** 今の画面（P1〜P5 など） */
  screen: string
  /** 今のモード（system・chat・drawing） */
  mode: string
  /** 案件の要約（memorySummaryOf の結果） */
  memoryText: string
  /** 図面の線（id と種類） */
  segments: readonly { id: string; kind?: string | null }[]
  /** 選んでいる線の id */
  selectedSegmentIds: readonly string[]
  /** 直近の操作（作業履歴の行を文にしたもの。古い順） */
  recentOps: readonly string[]
}

/** 文脈の区切りを、順に並べた文字列の列にする（先頭ほど変わりにくい） */
export function buildChatContext(input: ChatContextInput): string[] {
  const stable = `画面: ${input.screen}／モード: ${input.mode}`
  const selected = input.segments.filter((s) => input.selectedSegmentIds.includes(s.id)).slice(0, CHAT_EXCERPT_MAX)
  const excerpt = selected.length > 0 ? selected.map((s) => `線 ${s.id}（種類: ${s.kind ?? '未分類'}）`).join('\n') : '選んだ線はありません'
  const recent = input.recentOps.slice(-CHAT_RECENT_OPS)
  return [stable, input.memoryText, excerpt, recent.join('\n')]
}
