// 仕様: P3 の左メニューで、選んだ種類の中身を下に出す（ハブ A-03 G55、D-04 共通部品「左メニュー」）。文言・レイヤー名は仮置き。
// 代表の決定（G55）: 「図面のとき左メニューは必須。オブジェクトが何で、どんな内容が入っているかを可視化する。」
// 画面側の案: 「選んだものの中身（区画、面積、部屋、壁と開口の数、意味づけの結果、レイヤー）を下に出す。」
// 仕様 1（選択）: 左の行を押すと、その種類が選ばれる。選ばれるのは 1 つだけ。選んでいる種類をもう一度押すと、選びを外す。
// 仕様 2（一覧）: 選んだ種類のオブジェクトを、一覧で下に出す。他の種類は混ぜない。並びは入力の並びのまま。
// 仕様 3（空）: 件数が 0 なら「なし」と出す（0 でなければ出さない）。
// 仕様 4（住戸）: 住戸（区画候補）は、面積（m²、小数 1 桁）と部屋の数を出す（その次に、仕様 10 の壁と開口の数が続く）。
//   部屋の数は、P3 の部屋（rooms）のうち、その区画に属するものを数える。属し方は rooms.ts の roomsOfCells に従う
//   （部屋の ID は「区画の ID + '-' + 接尾辞」）。決められない（部屋の情報が無い）ときは「未算定」と出す。
// 仕様 5（通り芯）: 位置（mm）を出す。
// 仕様 6（コア・縦シャフト・廊下・部屋）: 寸法（幅 × 奥行、mm）を出す。幅は x1 − x0、奥行は y1 − y0。
// 仕様 7（未配線）: 筆界・外形・柱・壁・開口は、中身のデータが無いので「未配線」と出す。
// 仕様 8（共通の 2 行）: 全てのオブジェクトに「意味づけの結果: 未配線」「レイヤー: <名前>」の 2 行を、この順に最後へ付ける。
// 仕様 9（レイヤー名・仮置き）: 筆界→筆界、外形→外形、通り芯→通り芯、柱→柱、コア→コア、縦シャフト→縦シャフト（G66）、
//   廊下→その他、住戸→住戸、壁→壁、開口→開口、部屋→部屋、什器→その他（G13: 什器は「その他」の属性）。
//   「（G66）」は決定の出典（グリル記録 G66）で、レイヤー名は「縦シャフト」。
// 仕様 10（壁と開口の数・仮置き。画面側の案の中身の項目どおり）: 住戸の中身に「壁と開口の数: 未配線」の 1 行を、面積・部屋の数の次に出す。
//   P3 に壁と開口のデータがまだ無く、数を決められないので「未配線」。壁と開口を別々の行にはせず、1 行にまとめる。
//   住戸の行は 5 行（面積・部屋の数・壁と開口の数・意味づけの結果・レイヤー）。住戸以外の種類の行には出さない。
//   壁・開口の種類を選んだときは、これまでどおり件数 0 で「なし」。
// 仕様 11（純粋）: 入力を書き換えない。同じ入力には同じ出力。前の呼び出しに左右されない。
// 仕様 12（什器・仮置き。ハブ A-03 G69）: 什器は P3 で置いたもの（店舗の一覧。置いた順）。1 件ごとに、見出し「什器 <id>」と次の行を出す。
//   「品目: <品目名>」（キッチン・ユニットバス・洗面・便器・収納）、「区画: <区画の id>」（区画の指定が無い（null）ときは「区画: 区画なし」）、
//   そして仕様 8 の「意味づけの結果: 未配線」「レイヤー: その他」（仕様 9）。壁と開口の数の行は出さない。
//   区画の指定がある什器も、その区画がいまの区画（units）に無いときは「区画: 区画なし」（右パネルと P4 の数え方と同じ）。区画の一覧が無いときは、置いた区画の id をそのまま出す。
//   件数が 0 なら「なし」（仕様 3）。一覧は入力の並びのまま、区画なしの什器も落とさない（仕様 2）。
// 今回やらない: P2 の 2D と P4 への表示。
import { describe, expect, it } from 'vitest'
import type { Rect } from './candidateCells'
import { FIXTURE_ITEMS, type Fixture, type FixtureItem } from './fixtures'
import { detailOfKind, layerOfKind, toggleKind, type ObjectDetailSources } from './objectDetail'
import type { ObjectKind } from './objectMenu'
import { roomsOfCells, type Room } from './rooms'

// 12 種類と名前（左メニューの仕様どおり。什器は縦シャフト・廊下の後、住戸の前）
const KINDS: readonly (readonly [ObjectKind, string])[] = [
  ['siteBoundary', '筆界'],
  ['outline', '外形'],
  ['grid', '通り芯'],
  ['column', '柱'],
  ['core', 'コア'],
  ['shaft', '縦シャフト'],
  ['corridor', '廊下'],
  ['fixture', '什器'],
  ['unit', '住戸'],
  ['wall', '壁'],
  ['opening', '開口'],
  ['room', '部屋'],
]

// 仕様 9: 種類→レイヤー名（仮置き）
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

const MEANING = '意味づけの結果: 未配線'
const WALL_OPENING = '壁と開口の数: 未配線'
const NONE = 'なし'

// 区画（幅 = x1 − x0、奥行 = y1 − y0。mm）。既定は 6000 × 7200（43.2 m²。田の字・縦長・角・単独のどれでも割れる寸法）
const cell = (id: string, x0 = 0, y0 = 0, w = 6000, h = 7200): Rect => ({ id, x0, y0, x1: x0 + w, y1: y0 + h })

// 幅 3000、奥行 6000 の長方形（原点からずらしてある）
const RECT = { x0: 1000, y0: 2000, x1: 4000, y1: 8000 }
const SIZE = '寸法: 3000 × 6000 mm'

// n 個の長方形（ID は prefix + 通し番号）
const rects = (prefix: string, n: number): Rect[] => Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, ...RECT }))

// 品目は名前で引く（品目の ID は仮置きなので、試験に書かない）
function itemOf(label: string): FixtureItem {
  const found = FIXTURE_ITEMS.find((i) => i.label === label)
  if (!found) throw new Error(`品目「${label}」が無い`)
  return found.id
}
const kitchen = itemOf('キッチン')
const unitBath = itemOf('ユニットバス')
const washbasin = itemOf('洗面')
const toilet = itemOf('便器')
const storage = itemOf('収納')
const fx = (id: string, item: FixtureItem, unitId: string | null): Fixture => ({ id, item, unitId })

// 種類ごとに件数がすべて違う入力（種類の取り違えを見つけるため）
const UNITS = Array.from({ length: 6 }, (_, i) => cell(`L${i}`, 7000 * i))
// 什器 8 件（置いた順。区画なしが 2 件、いまの区画 L0〜L5 に無い区画 ZZ が 1 件。id は連番とは限らない）
const FIXTURES: Fixture[] = [
  fx('fixture-1', kitchen, 'L0'),
  fx('fixture-2', unitBath, 'L0'),
  fx('fixture-3', washbasin, 'L1'),
  fx('fixture-4', toilet, null),
  fx('fixture-5', storage, 'L2'),
  fx('fixture-6', kitchen, 'L3'),
  fx('fixture-8', toilet, 'ZZ'),
  fx('fixture-9', storage, null),
]
const FULL: ObjectDetailSources = {
  siteBoundaries: [{ id: 'b0' }, { id: 'b1' }],
  outlines: [{ id: 'o0' }],
  gridLines: [0, 3_000, 6_000, 9_000, 12_000, 15_000, 18_000],
  cores: rects('core', 3),
  shafts: rects('shaft', 5),
  corridors: rects('cor', 4),
  fixtures: FIXTURES,
  units: UNITS,
  rooms: roomsOfCells(UNITS),
}
const FULL_COUNTS: Record<ObjectKind, number> = {
  siteBoundary: 2,
  outline: 1,
  grid: 7,
  column: 0,
  core: 3,
  shaft: 5,
  corridor: 4,
  fixture: 8,
  unit: 6,
  wall: 0,
  opening: 0,
  room: 24,
}

const linesOf = (kind: ObjectKind, sources: ObjectDetailSources) => detailOfKind(kind, sources).entries.map((e) => e.lines)

function deepFreeze<T>(o: T): T {
  if (o !== null && typeof o === 'object') {
    Object.freeze(o)
    for (const v of Object.values(o)) deepFreeze(v)
  }
  return o
}

describe('toggleKind（種類の選択。仕様 1）', () => {
  it('何も選んでいないとき、押した種類が選ばれる', () => {
    expect(toggleKind(null, 'unit')).toBe('unit')
  })

  it('別の種類を押すと、その種類に替わる（選ばれるのは 1 つだけ）', () => {
    expect(toggleKind('unit', 'room')).toBe('room')
  })

  it('選んでいる種類をもう一度押すと、選びが外れる', () => {
    expect(toggleKind('unit', 'unit')).toBeNull()
  })

  it('押す順に畳み込んでも、選びは高々 1 つで、同じ種類の連続した 2 回は元に戻る', () => {
    const pressed: ObjectKind[] = ['unit', 'unit', 'room', 'grid', 'grid', 'grid']
    const states: (ObjectKind | null)[] = []
    let state: ObjectKind | null = null
    for (const k of pressed) {
      state = toggleKind(state, k)
      states.push(state)
    }
    expect(states).toEqual(['unit', null, 'room', 'grid', null, 'grid'])
  })

  it('どの種類でも、押すと選ばれ、もう一度押すと外れる', () => {
    for (const [kind] of KINDS) {
      expect(toggleKind(null, kind), kind).toBe(kind)
      expect(toggleKind(kind, kind), kind).toBeNull()
    }
  })
})

describe('layerOfKind（種類→レイヤー名。仕様 9）', () => {
  it('12 種類すべてが、仕様のレイヤー名になる（廊下と什器は「その他」、縦シャフトは「縦シャフト」）', () => {
    for (const [kind] of KINDS) expect(layerOfKind(kind), kind).toBe(LAYER_OF[kind])
  })
})

describe('detailOfKind（一覧と「なし」。仕様 2・3）', () => {
  it('結果が選んだ種類の入力の件数だけ並ぶ（種類を取り違えない）', () => {
    for (const [kind] of KINDS) {
      expect(detailOfKind(kind, FULL).entries, kind).toHaveLength(FULL_COUNTS[kind])
    }
  })

  it('選んだ種類と名前を返す（種類の名前は左メニューと同じ）', () => {
    for (const [kind, label] of KINDS) {
      const d = detailOfKind(kind, FULL)
      expect(d.kind).toBe(kind)
      expect(d.label).toBe(label)
    }
  })

  it('件数が 0 の種類は、一覧が空で「なし」と出す', () => {
    for (const [kind] of KINDS) {
      const d = detailOfKind(kind, {})
      expect(d.entries, kind).toEqual([])
      expect(d.emptyText, kind).toBe(NONE)
    }
  })

  it('未指定でも空配列でも同じ', () => {
    const empty: ObjectDetailSources = {
      siteBoundaries: [],
      outlines: [],
      gridLines: [],
      cores: [],
      shafts: [],
      corridors: [],
      fixtures: [],
      units: [],
      rooms: [],
    }
    for (const [kind] of KINDS) {
      expect(detailOfKind(kind, empty), kind).toEqual(detailOfKind(kind, {}))
      expect(detailOfKind(kind, empty).emptyText, kind).toBe(NONE)
    }
  })

  it('1 件以上あるときは「なし」を出さない', () => {
    for (const [kind] of KINDS) {
      if (FULL_COUNTS[kind] === 0) continue
      const d = detailOfKind(kind, FULL)
      expect(d.entries.length, kind).toBeGreaterThan(0)
      expect(d.emptyText, kind).toBeUndefined()
    }
  })

  it('柱・壁・開口は、他の種類の結果がそろっていても件数 0（データが無い）なので「なし」', () => {
    for (const kind of ['column', 'wall', 'opening'] as const) {
      const d = detailOfKind(kind, FULL)
      expect(d.entries, kind).toEqual([])
      expect(d.emptyText, kind).toBe(NONE)
    }
  })

  it('一覧は入力の並びのまま', () => {
    const units = [cell('R0', 8000, 0, 3000, 5190), cell('L0'), cell('L1', 0, 8000, 3000, 5110)]
    expect(linesOf('unit', { units }).map((l) => l[0])).toEqual(['面積: 15.6 m²', '面積: 43.2 m²', '面積: 15.3 m²'])
  })

  it('各オブジェクトは区別できる見出しを持つ（ID があれば ID を含み、無ければ 1 から始まる通し番号を含む）', () => {
    const units = detailOfKind('unit', FULL).entries.map((e) => e.title)
    UNITS.forEach((u, i) => expect(units[i]).toContain(u.id))
    expect(new Set(units).size).toBe(units.length)

    const grid = detailOfKind('grid', FULL).entries.map((e) => e.title)
    grid.forEach((t, i) => expect(t).toContain(String(i + 1)))
    expect(new Set(grid).size).toBe(grid.length)

    const fixtures = detailOfKind('fixture', FULL).entries.map((e) => e.title)
    FIXTURES.forEach((f, i) => expect(fixtures[i]).toContain(f.id))
    expect(new Set(fixtures).size).toBe(fixtures.length)
  })
})

describe('detailOfKind（住戸の面積。仕様 4）', () => {
  const areaLine = (w: number, h: number, x0 = 0, y0 = 0) => linesOf('unit', { units: [cell('L0', x0, y0, w, h)] })[0]?.[0]

  it('面積を m² で出す（mm² を 1,000,000 で割る）', () => {
    expect(areaLine(6000, 7200)).toBe('面積: 43.2 m²')
  })

  it('小数 1 桁で出す（割り切れても 1 桁。100 m² を超えても同じ）', () => {
    expect(areaLine(6000, 7500)).toBe('面積: 45.0 m²')
    expect(areaLine(12_000, 18_000)).toBe('面積: 216.0 m²')
  })

  it('小数 2 桁目を四捨五入する（切り捨てない）', () => {
    expect(areaLine(3000, 5190)).toBe('面積: 15.6 m²') // 15.57
    expect(areaLine(3000, 5110)).toBe('面積: 15.3 m²') // 15.33
  })

  it('区画の位置（x0, y0）に左右されない', () => {
    expect(areaLine(6000, 7200, 9000, 4000)).toBe('面積: 43.2 m²')
  })
})

describe('detailOfKind（住戸の部屋の数。仕様 4）', () => {
  const countLines = (units: readonly Rect[], rooms?: readonly Room[]) =>
    linesOf('unit', rooms === undefined ? { units } : { units, rooms }).map((l) => l[1])

  it('その区画に属する部屋を数える（田の字 4・縦長 4・角 3・単独 2）', () => {
    const a = cell('L0')
    for (const [pattern, n] of [
      ['田の字', 4],
      ['縦長', 4],
      ['角', 3],
      ['単独', 2],
    ] as const) {
      expect(countLines([a], roomsOfCells([a], pattern)), pattern).toEqual([`部屋の数: ${n}`])
    }
  })

  it('区画ごとに、その区画の部屋だけを数える（他の区画の部屋は数えない）', () => {
    const a = cell('L0')
    const b = cell('R0', 8000)
    const rooms = [...roomsOfCells([a], '角'), ...roomsOfCells([b], '単独')]
    expect(countLines([a, b], rooms)).toEqual(['部屋の数: 3', '部屋の数: 2'])
    // 部屋の並びを入れ替えても同じ
    expect(countLines([a, b], [...rooms].reverse())).toEqual(['部屋の数: 3', '部屋の数: 2'])
  })

  it('ID の前半が同じ別の区画の部屋を混ぜない（L1 と L10）', () => {
    const a = cell('L1')
    const b = cell('L10', 8000)
    expect(countLines([a, b], roomsOfCells([a, b]))).toEqual(['部屋の数: 4', '部屋の数: 4'])
  })

  it('ID にハイフンを含む区画があっても混ぜない（a と a-b）', () => {
    const a = cell('a')
    const b = cell('a-b', 8000)
    expect(countLines([a, b], roomsOfCells([a, b], '角'))).toEqual(['部屋の数: 3', '部屋の数: 3'])
    expect(countLines([a], roomsOfCells([a, b]))).toEqual(['部屋の数: 4'])
  })

  it('部屋の一覧にその区画の部屋が無ければ 0（部屋の情報はあるので決められる）', () => {
    const a = cell('L0')
    const b = cell('R0', 8000)
    expect(countLines([a, b], roomsOfCells([b]))).toEqual(['部屋の数: 0', '部屋の数: 4'])
    expect(countLines([a], [])).toEqual(['部屋の数: 0'])
  })

  it('部屋の情報が無い（未指定）ときは「未算定」と出す', () => {
    expect(countLines([cell('L0'), cell('R0', 8000)])).toEqual(['部屋の数: 未算定', '部屋の数: 未算定'])
  })
})

describe('detailOfKind（通り芯の位置。仕様 5）', () => {
  it('1 本ごとに位置（mm）を出す（入力の並びのまま）', () => {
    const l = linesOf('grid', { gridLines: [500, 3_500, 6_500, 9_500] })
    expect(l.map((x) => x[0])).toEqual(['位置: 500 mm', '位置: 3500 mm', '位置: 6500 mm', '位置: 9500 mm'])
  })

  it('位置が 0 の通り芯も出す', () => {
    expect(linesOf('grid', { gridLines: [0, 3_000] }).map((x) => x[0])).toEqual(['位置: 0 mm', '位置: 3000 mm'])
  })

  it('通り芯の行は、位置・意味づけの結果・レイヤーの 3 行だけ', () => {
    expect(linesOf('grid', { gridLines: [500] })).toEqual([['位置: 500 mm', MEANING, 'レイヤー: 通り芯']])
  })
})

describe('detailOfKind（コア・縦シャフト・廊下・部屋の寸法。仕様 6）', () => {
  it('コアは寸法（幅 × 奥行、mm）を出す', () => {
    expect(linesOf('core', { cores: [{ id: 'stairA', ...RECT }] })).toEqual([[SIZE, MEANING, 'レイヤー: コア']])
  })

  it('縦シャフトは寸法（幅 × 奥行、mm）を出す', () => {
    // 幅 600、奥行 1200（幅と奥行を取り違えると見つかる）
    const shafts = [{ id: 'PS-L0', x0: 100, y0: 200, x1: 700, y1: 1400 }]
    expect(linesOf('shaft', { shafts })).toEqual([['寸法: 600 × 1200 mm', MEANING, 'レイヤー: 縦シャフト']])
  })

  it('廊下は寸法（幅 × 奥行、mm）を出し、レイヤーは「その他」', () => {
    const corridors = [{ id: 'corridor', x0: 6000, y0: 0, x1: 8000, y1: 14_400 }]
    expect(linesOf('corridor', { corridors })).toEqual([['寸法: 2000 × 14400 mm', MEANING, 'レイヤー: その他']])
  })

  it('部屋は寸法（幅 × 奥行、mm）を出す', () => {
    const rooms: Room[] = [
      { id: 'L0-LDK', kind: 'LDK', x0: 0, y0: 0, x1: 4500, y1: 7200 },
      { id: 'L0-WET', kind: '水回り', x0: 4500, y0: 0, x1: 6000, y1: 3600 },
    ]
    expect(linesOf('room', { rooms })).toEqual([
      ['寸法: 4500 × 7200 mm', MEANING, 'レイヤー: 部屋'],
      ['寸法: 1500 × 3600 mm', MEANING, 'レイヤー: 部屋'],
    ])
  })

  it('複数あるときは、入力の並びのまま 1 件ずつ出す', () => {
    const cores = [
      { id: 'stairA', x0: 0, y0: 0, x1: 3000, y1: 6000 },
      { id: 'evHall', x0: 0, y0: 6000, x1: 2000, y1: 9000 },
    ]
    expect(linesOf('core', { cores }).map((x) => x[0])).toEqual(['寸法: 3000 × 6000 mm', '寸法: 2000 × 3000 mm'])
  })

  it('寸法は区画の位置に左右されない（原点が違っても同じ寸法）', () => {
    const at = (x0: number, y0: number) => linesOf('corridor', { corridors: [{ id: 'c', x0, y0, x1: x0 + 2000, y1: y0 + 5000 }] })[0]?.[0]
    expect(at(0, 0)).toBe('寸法: 2000 × 5000 mm')
    expect(at(12_000, 34_000)).toBe('寸法: 2000 × 5000 mm')
  })
})

describe('detailOfKind（中身が無い種類は「未配線」。仕様 7）', () => {
  it('筆界は、1 件ごとに「中身: 未配線」と出す', () => {
    expect(linesOf('siteBoundary', { siteBoundaries: [{}, {}] })).toEqual([
      ['中身: 未配線', MEANING, 'レイヤー: 筆界'],
      ['中身: 未配線', MEANING, 'レイヤー: 筆界'],
    ])
  })

  it('外形は、1 件ごとに「中身: 未配線」と出す', () => {
    expect(linesOf('outline', { outlines: [{ id: 'o0' }] })).toEqual([['中身: 未配線', MEANING, 'レイヤー: 外形']])
  })
})

describe('detailOfKind（什器の中身。仕様 12）', () => {
  it('1 件ごとに、見出し「什器 <id>」と、品目・区画・意味づけの結果・レイヤーの 4 行を出す', () => {
    expect(detailOfKind('fixture', { fixtures: [fx('fixture-1', kitchen, 'L0')] }).entries).toEqual([
      { title: '什器 fixture-1', lines: ['品目: キッチン', '区画: L0', MEANING, 'レイヤー: その他'] },
    ])
  })

  it('品目は品目の名前で出す（5 品目とも）', () => {
    const fixtures = [
      fx('fixture-1', kitchen, 'L0'),
      fx('fixture-2', unitBath, 'L0'),
      fx('fixture-3', washbasin, 'L0'),
      fx('fixture-4', toilet, 'L0'),
      fx('fixture-5', storage, 'L0'),
    ]
    expect(linesOf('fixture', { fixtures }).map((l) => l[0])).toEqual([
      '品目: キッチン',
      '品目: ユニットバス',
      '品目: 洗面',
      '品目: 便器',
      '品目: 収納',
    ])
  })

  it('区画の指定が無い（null）什器は、「区画: 区画なし」と出す', () => {
    expect(linesOf('fixture', { fixtures: [fx('fixture-1', toilet, null)] })).toEqual([
      ['品目: 便器', '区画: 区画なし', MEANING, 'レイヤー: その他'],
    ])
  })

  it('区画の指定がある什器は、いまの区画（units）に無いときは「区画なし」と出す（一覧が無いときは id をそのまま。仮置き）', () => {
    const fixtures = [fx('fixture-1', kitchen, 'ZZ')]
    expect(linesOf('fixture', { fixtures })[0]?.[1]).toBe('区画: ZZ')
    expect(linesOf('fixture', { fixtures, units: [cell('L0')] })[0]?.[1]).toBe('区画: 区画なし')
    expect(linesOf('fixture', { fixtures, units: [cell('ZZ')] })[0]?.[1]).toBe('区画: ZZ')
  })

  it('一覧は入力の並び（置いた順）のまま、区画なしの什器も落とさない', () => {
    expect(detailOfKind('fixture', FULL).entries.map((e) => e.title)).toEqual(FIXTURES.map((f) => `什器 ${f.id}`))
    expect(linesOf('fixture', FULL).map((l) => l[1])).toEqual([
      '区画: L0',
      '区画: L0',
      '区画: L1',
      '区画: 区画なし',
      '区画: L2',
      '区画: L3',
      '区画: 区画なし',
      '区画: 区画なし',
    ])
  })

  it('什器が 0 件なら、一覧が空で「なし」（未指定でも空配列でも）。ほかの種類の入力があっても同じ', () => {
    const inputs: ObjectDetailSources[] = [{}, { fixtures: [] }, { ...FULL, fixtures: [] }]
    for (const sources of inputs) {
      const d = detailOfKind('fixture', sources)
      expect(d.entries).toEqual([])
      expect(d.emptyText).toBe(NONE)
    }
  })

  it('什器の入力は、ほかの種類の一覧に混ざらない（什器だけの入力では、ほかの種類は「なし」）', () => {
    for (const [kind] of KINDS) {
      if (kind === 'fixture') continue
      expect(detailOfKind(kind, { fixtures: FIXTURES }).entries, kind).toEqual([])
    }
  })
})

describe('detailOfKind（全てのオブジェクトに付く 2 行。仕様 8）', () => {
  it('どの種類のどのオブジェクトも、最後の 2 行が「意味づけの結果: 未配線」「レイヤー: <名前>」', () => {
    let seen = 0
    for (const [kind] of KINDS) {
      for (const e of detailOfKind(kind, FULL).entries) {
        seen += 1
        expect(e.lines.slice(-2), `${kind} ${e.title}`).toEqual([MEANING, `レイヤー: ${LAYER_OF[kind]}`])
      }
    }
    // 空振りでないこと（件数の合計 = 2+1+7+3+5+4+8+6+24 = 60）
    expect(seen).toBe(60)
  })

  it('住戸は、面積・部屋の数・壁と開口の数・意味づけの結果・レイヤーの 5 行（壁と開口の数は「未配線」）', () => {
    const a = cell('L0')
    expect(linesOf('unit', { units: [a], rooms: roomsOfCells([a]) })).toEqual([
      ['面積: 43.2 m²', '部屋の数: 4', WALL_OPENING, MEANING, 'レイヤー: 住戸'],
    ])
  })
})

describe('detailOfKind（壁と開口の数は住戸にだけ出す。仕様 10）', () => {
  it('全ての住戸の行に、面積・部屋の数の次に「壁と開口の数: 未配線」が 1 行だけ出る', () => {
    const entries = detailOfKind('unit', FULL).entries
    expect(entries).toHaveLength(6)
    for (const e of entries) {
      expect(e.lines.filter((l) => /壁|開口/.test(l)), e.title).toEqual([WALL_OPENING])
      expect(e.lines[2], e.title).toBe(WALL_OPENING)
    }
  })

  it('壁と開口は別々の行にせず、住戸の行の数は 5（面積・部屋の数・壁と開口の数・意味づけの結果・レイヤー）', () => {
    for (const e of detailOfKind('unit', FULL).entries) expect(e.lines, e.title).toHaveLength(5)
  })

  it('部屋の情報が無く、部屋の数が「未算定」のときも、壁と開口の数は「未配線」のまま', () => {
    expect(linesOf('unit', { units: [cell('L0')] })).toEqual([
      ['面積: 43.2 m²', '部屋の数: 未算定', WALL_OPENING, MEANING, 'レイヤー: 住戸'],
    ])
  })

  it('住戸以外の種類のどのオブジェクトの行にも、壁・開口は出てこない', () => {
    let seen = 0
    for (const [kind] of KINDS) {
      if (kind === 'unit') continue
      for (const e of detailOfKind(kind, FULL).entries) {
        seen += 1
        expect(e.lines.some((l) => /壁|開口/.test(l)), `${kind} ${e.title}`).toBe(false)
      }
    }
    // 空振りでないこと（住戸の 6 件を除いた件数の合計 = 2+1+7+3+5+4+8+24 = 54）
    expect(seen).toBe(54)
  })

  it('壁・開口の種類を選んだときは、住戸がそろっていても件数 0 で「なし」（壁と開口の数は種類の行としては出さない）', () => {
    for (const kind of ['wall', 'opening'] as const) {
      const d = detailOfKind(kind, FULL)
      expect(d.entries, kind).toEqual([])
      expect(d.emptyText, kind).toBe(NONE)
    }
  })
})

describe('detailOfKind（純粋。仕様 11）', () => {
  it('入力を書き換えない（凍結した入力でも動き、中身が変わらない）', () => {
    const frozen = deepFreeze(structuredClone(FULL))
    const before = JSON.stringify(frozen)
    for (const [kind] of KINDS) expect(() => detailOfKind(kind, frozen), kind).not.toThrow()
    expect(JSON.stringify(frozen)).toBe(before)
    expect(detailOfKind('unit', frozen).entries).toHaveLength(6)
  })

  it('同じ入力には同じ出力で、前の呼び出しに左右されない', () => {
    const first = detailOfKind('unit', FULL)
    detailOfKind('grid', { gridLines: [1] })
    detailOfKind('unit', {})
    expect(detailOfKind('unit', FULL)).toEqual(first)
    expect(first.entries).toHaveLength(6)
  })

  it('toggleKind も純粋（同じ入力には同じ出力）', () => {
    expect(toggleKind('unit', 'room')).toBe(toggleKind('unit', 'room'))
    expect(toggleKind(null, 'wall')).toBe('wall')
    expect(toggleKind('wall', 'wall')).toBeNull()
  })
})
