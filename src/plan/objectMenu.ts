// P3 の左メニューの件数（ハブ A-03 G55、D-04 共通部品「左メニュー」）。描画にも状態にも依存しない純粋な処理。
// 件数は P3 の自動作成の結果の長さ。柱・壁・開口は意味づけ（W1）が未配線なので、件数は 0 で「意味づけ未配線」と注記する（仮置き）。
// 什器（G69）は自動作成の結果ではなく、P3 で置いた什器の一覧の数（区画なしの什器も 1 件と数える）。

/**
 * 左メニューの種類。D-04 の 9 種類（筆界・外形・通り芯・柱・コア・住戸・壁・開口・部屋）に、P3 の縦シャフト・廊下と、P3 で置いた什器（G69）を足す。
 * 什器は縦シャフト・廊下の後、住戸の前に並べる（仮置き）。
 */
export type ObjectKind =
  | 'siteBoundary'
  | 'outline'
  | 'grid'
  | 'column'
  | 'core'
  | 'shaft'
  | 'corridor'
  | 'fixture'
  | 'unit'
  | 'wall'
  | 'opening'
  | 'room'

/** P3 の自動作成の結果と、置いた什器（種類ごとの配列）。未指定は 0 件。要素の形は件数に関係しない。 */
export interface ObjectSources {
  columns?: readonly unknown[]
  siteBoundaries?: readonly unknown[]
  outlines?: readonly unknown[]
  gridLines?: readonly unknown[]
  cores?: readonly unknown[]
  shafts?: readonly unknown[]
  corridors?: readonly unknown[]
  /** P3 で置いた什器（店舗の一覧）。区画なしの什器も含む */
  fixtures?: readonly unknown[]
  units?: readonly unknown[]
  rooms?: readonly unknown[]
}

/** 左メニューの 1 行（種類ごと）。note は意味づけが未配線の種類だけに付く。 */
export interface ObjectCountRow {
  kind: ObjectKind
  label: string
  count: number
  note?: string
}

// 並びと名前。source を持たない種類は、P3 にデータが無い（意味づけ未配線）。
const MENU: readonly { kind: ObjectKind; label: string; source?: keyof ObjectSources }[] = [
  { kind: 'siteBoundary', label: '筆界', source: 'siteBoundaries' },
  { kind: 'outline', label: '外形', source: 'outlines' },
  { kind: 'grid', label: '通り芯', source: 'gridLines' },
  { kind: 'column', label: '柱', source:'columns' },
  { kind: 'core', label: 'コア', source: 'cores' },
  { kind: 'shaft', label: '縦シャフト', source: 'shafts' },
  { kind: 'corridor', label: '廊下', source: 'corridors' },
  { kind: 'fixture', label: '什器', source: 'fixtures' },
  { kind: 'unit', label: '住戸', source: 'units' },
  { kind: 'wall', label: '壁' },
  { kind: 'opening', label: '開口' },
  { kind: 'room', label: '部屋', source: 'rooms' },
]

/** 左メニューの行（種類ごと 1 行）を、P3 の結果から数える。入力は書き換えない。 */
export function countObjects(sources: ObjectSources): ObjectCountRow[] {
  return MENU.map(({ kind, label, source }): ObjectCountRow => {
    if (source === undefined) return { kind, label, count: 0 }
    return { kind, label, count: sources[source]?.length ?? 0 }
  })
}
