// P3 の左メニューで、選んだ種類の中身を下に出す（ハブ A-03 G55、D-04 共通部品「左メニュー」）。描画にも状態にも依存しない純粋な処理。
// 文言とレイヤー名は仮置き。出せる項目だけを出す:
//   住戸 = 面積・部屋の数・壁と開口の数（「未配線」。P3 に壁と開口のデータが無い。仮置き） / 通り芯 = 位置 / コア・縦シャフト・廊下・部屋 = 寸法 /
//   筆界・外形 = 「未配線」（中身のデータが無い） / 什器（G69） = 品目・区画（いまの区画に無いときは「区画なし」）。
// 柱・壁・開口は P3 にデータが無く件数 0 なので「なし」（壁と開口の数は、種類の行としては出さず、住戸の 1 行にまとめる）。
// 全てのオブジェクトの最後に「意味づけの結果」と「レイヤー」の 2 行を付ける。
import type { Rect } from './candidateCells'
import { fixtureLabel, type Fixture } from './fixtures'
import { countObjects, type ObjectKind, type ObjectSources } from './objectMenu'
import type { Room } from './rooms'

/** 中身を出すための P3 の結果。要素の形は種類ごとに決まっている（件数だけの objectMenu より狭い）。 */
export interface ObjectDetailSources extends ObjectSources {
  /** 通り芯の位置（mm）の並び */
  gridLines?: readonly number[]
  cores?: readonly Rect[]
  shafts?: readonly Rect[]
  corridors?: readonly Rect[]
  /** P3 で置いた什器（店舗の一覧。置いた順。区画なしの什器も含む） */
  fixtures?: readonly Fixture[]
  /** 住戸の区画候補 */
  units?: readonly Rect[]
  rooms?: readonly Room[]
}

/** 一覧の 1 件。lines は「項目名: 値」の行で、最後の 2 行は「意味づけの結果」と「レイヤー」。 */
export interface ObjectDetailEntry {
  title: string
  lines: string[]
}

export interface ObjectDetail {
  kind: ObjectKind
  label: string
  entries: ObjectDetailEntry[]
  /** 件数が 0 のときだけ付く（「なし」） */
  emptyText?: string
}

const NONE = 'なし'
const UNWIRED = '未配線'
const NOT_COMPUTED = '未算定'
// 壁と開口の数（G55 の中身の項目）。P3 に壁と開口のデータが無く数を決められないので、住戸の 1 行に「未配線」と出す（仮置き）
const WALL_OPENING_COUNT_LINE = `壁と開口の数: ${UNWIRED}`
// 什器の区画の指定が無いとき（仮置き）
const NO_UNIT = '区画なし'

// 種類→レイヤー名（仮置き）。廊下は専用のレイヤーが無く「その他」。縦シャフトは G66 で独立したレイヤーになった。什器は G13 で「その他」の属性。
const LAYER_OF: Record<ObjectKind, string> = {
  siteBoundary: '筆界',
  outline: '外形',
  grid: '通り芯',
  column: '柱',
  core: 'コア',
  shaft: '縦シャフト',
  corridor: 'その他',
  fixture: 'その他',
  unit: '住戸',
  wall: '壁',
  opening: '開口',
  room: '部屋',
}

// 種類の名前は左メニューのものをそのまま使う（二重に持たない）
const LABELS: ReadonlyMap<ObjectKind, string> = new Map(countObjects({}).map((r): [ObjectKind, string] => [r.kind, r.label]))
const labelOf = (kind: ObjectKind): string => LABELS.get(kind) ?? kind

/** 種類→レイヤー名（仮置き）。 */
export function layerOfKind(kind: ObjectKind): string {
  return LAYER_OF[kind]
}

/** 左の行を押したときの選び方。選ばれるのは 1 つだけで、選んでいる種類をもう一度押すと外れる。 */
export function toggleKind(selected: ObjectKind | null, clicked: ObjectKind): ObjectKind | null {
  return selected === clicked ? null : clicked
}

// 幅は x1 − x0、奥行は y1 − y0（mm）
const sizeLine = (r: Rect): string => `寸法: ${r.x1 - r.x0} × ${r.y1 - r.y0} mm`

// 面積は mm² を m² にして小数 1 桁（0.1 m² = 100,000 mm² の単位で四捨五入する）
const areaLine = (r: Rect): string => `面積: ${(Math.round(((r.x1 - r.x0) * (r.y1 - r.y0)) / 100_000) / 10).toFixed(1)} m²`

// 区画に属する部屋の数。roomsOfCells が作る部屋の ID は「区画の ID + '-' + 接尾辞（LDK・W1 など。ハイフンを含まない）」。
// 部屋の情報が無い（未指定）ときは決められないので「未算定」。
function roomCountLine(unit: Rect, rooms: readonly Room[] | undefined): string {
  if (rooms === undefined) return `部屋の数: ${NOT_COMPUTED}`
  const prefix = `${unit.id}-`
  const n = rooms.filter((r) => r.id.startsWith(prefix) && !r.id.slice(prefix.length).includes('-')).length
  return `部屋の数: ${n}`
}

function entry(kind: ObjectKind, name: string | number, own: readonly string[]): ObjectDetailEntry {
  return { title: `${labelOf(kind)} ${name}`, lines: [...own, `意味づけの結果: ${UNWIRED}`, `レイヤー: ${LAYER_OF[kind]}`] }
}

const rectEntries = (kind: ObjectKind, rects: readonly Rect[] | undefined): ObjectDetailEntry[] =>
  (rects ?? []).map((r) => entry(kind, r.id, [sizeLine(r)]))

const unwiredEntries = (kind: ObjectKind, items: readonly unknown[] | undefined): ObjectDetailEntry[] =>
  (items ?? []).map((_, i) => entry(kind, i + 1, [`中身: ${UNWIRED}`]))

function entriesOf(kind: ObjectKind, s: ObjectDetailSources): ObjectDetailEntry[] {
  switch (kind) {
    case 'unit':
      return (s.units ?? []).map((u) => entry(kind, u.id, [areaLine(u), roomCountLine(u, s.rooms), WALL_OPENING_COUNT_LINE]))
    case 'grid':
      return (s.gridLines ?? []).map((pos, i) => entry(kind, i + 1, [`位置: ${pos} mm`]))
    case 'core':
      return rectEntries(kind, s.cores)
    case 'shaft':
      return rectEntries(kind, s.shafts)
    case 'corridor':
      return rectEntries(kind, s.corridors)
    case 'fixture': {
      // いまの区画（units）に無い什器は「区画なし」（右パネルと P4 の数え方と同じ）。区画の一覧が無いときは、置いた区画の id をそのまま出す（仮置き）
      const unitIds = s.units ? new Set(s.units.map((u) => u.id)) : null
      return (s.fixtures ?? []).map((f) => {
        const placed = f.unitId !== null && (unitIds === null || unitIds.has(f.unitId))
        return entry(kind, f.id, [`品目: ${fixtureLabel(f.item)}`, `区画: ${placed ? f.unitId : NO_UNIT}`])
      })
    }
    case 'room':
      return rectEntries(kind, s.rooms)
    case 'siteBoundary':
      return unwiredEntries(kind, s.siteBoundaries)
    case 'outline':
      return unwiredEntries(kind, s.outlines)
    case 'column':
    case 'wall':
    case 'opening':
      // P3 にデータが無い（件数は常に 0）
      return []
  }
}

/** 選んだ種類のオブジェクトを、一覧にする。入力は書き換えない。 */
export function detailOfKind(kind: ObjectKind, sources: ObjectDetailSources): ObjectDetail {
  const entries = entriesOf(kind, sources)
  const detail: ObjectDetail = { kind, label: labelOf(kind), entries }
  if (entries.length === 0) detail.emptyText = NONE
  return detail
}
