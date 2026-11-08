// メニューのチェック付きの行の並び（ハブ A-03 G43・G70・G73・G74、統括の依頼 t51・2026-11-04）。決定論。
// 「右パネルの項目」は P2 を先に、P3 を後に並べる。「機能一覧」は 表示・操作・計算 の三つ。チェックは呼び出し側の画面の状態から決める。
import { MODE_TILE_IDS, PANEL_TILES } from '../store/panelTiles'
import { FEATURE_ITEMS, type FeatureItem, type FeatureKey } from '../store/features'

export interface MenuRow {
  id: string
  title: string
  /** チェックが入っている行 */
  shown: boolean
}

export interface MenuGroup {
  heading: string
  rows: MenuRow[]
}

/**
 * 右パネルの項目を、P2（ボリューム）・P3（平面）・共通（モードの項目。G95）の三つのグループにする。行の順は右パネルの一覧の順。
 * チェックは閉じていないタイル。今のモードで隠す項目（hiddenByMode。G127）は、閉じた印にする
 */
export function panelMenuGroupsOf(
  hidden: Readonly<Record<string, true>>,
  tiles: readonly { id: string; title: string }[] = PANEL_TILES,
  hiddenByMode: readonly string[] = [],
): MenuGroup[] {
  const rowOf = (t: { id: string; title: string }): MenuRow => ({ id: t.id, title: t.title, shown: !hidden[t.id] && !hiddenByMode.includes(t.id) })
  const isMode = (id: string) => MODE_TILE_IDS.includes(id)
  return [
    { heading: 'ボリューム', rows: tiles.filter((t) => t.id.startsWith('p2-')).map(rowOf) },
    { heading: '平面', rows: tiles.filter((t) => !t.id.startsWith('p2-') && !isMode(t.id)).map(rowOf) },
    { heading: '共通', rows: tiles.filter((t) => isMode(t.id)).map(rowOf) },
  ]
}

/** 機能一覧を、表示・操作・計算の三つのグループにする。行の順は機能の一覧の順。つながっていない項目は名前に「（未接続）」を付ける */
export function featureMenuGroupsOf(
  shownOf: (key: FeatureKey) => boolean,
  items: readonly FeatureItem[] = FEATURE_ITEMS,
): MenuGroup[] {
  return (['表示', '操作', '計算'] as const).map((group) => ({
    heading: group,
    rows: items
      .filter((i) => i.group === group)
      .map((i) => ({ id: i.key, title: i.connected ? i.label : `${i.label}（未接続）`, shown: shownOf(i.key) })),
  }))
}
