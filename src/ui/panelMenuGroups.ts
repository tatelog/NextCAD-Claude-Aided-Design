// メニューの「右パネルの項目」の並び（ハブ A-03 G43・G73・G74、統括の依頼 t51）。P2 の機能を先に、P3 を後に並べる。画面の状態（閉じたタイル）から、各行のチェックを決める。決定論。
import { PANEL_TILES } from '../store/panelTiles'

export interface PanelMenuRow {
  id: string
  title: string
  /** チェックが入っている（閉じていない）行 */
  shown: boolean
}

export interface PanelMenuGroup {
  heading: string
  rows: PanelMenuRow[]
}

/** 右パネルの項目を、P2（ボリューム）と P3（平面）の二つのグループにする。行の順は右パネルの一覧の順 */
export function panelMenuGroupsOf(
  hidden: Readonly<Record<string, true>>,
  tiles: readonly { id: string; title: string }[] = PANEL_TILES,
): PanelMenuGroup[] {
  const rowOf = (t: { id: string; title: string }): PanelMenuRow => ({ id: t.id, title: t.title, shown: !hidden[t.id] })
  return [
    { heading: 'P2（ボリューム）', rows: tiles.filter((t) => t.id.startsWith('p2-')).map(rowOf) },
    { heading: 'P3（平面）', rows: tiles.filter((t) => !t.id.startsWith('p2-')).map(rowOf) },
  ]
}
