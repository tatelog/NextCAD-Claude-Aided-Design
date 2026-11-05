// 仕様: 左メニュー（ハブ A-03 G55、D-04 共通部品「左メニュー」）の入力を、P2 の 2D 平面・P3・P4 で共通に組み立てる。件数・文言は仮置き。
// 代表の決定（G55）: 「図面のとき左メニューは必須。オブジェクトが何で、どんな内容が入っているかを可視化する。」
// 画面側の案: 「左に「オブジェクト」の一覧を、種類ごとに件数つきで並べる。選んだものの中身を下に出す。P2 の 2D 平面、P3、P4 に出す。3D のときに出すかは未決。」
//
// 【P3 の自動作成の結果から】objectSourcesOfPlan(plan)。P3 が今出している件数と同じになるように組み立てる。
// 仕様 1（種類ごとの入力）: コア = 結果のコア（階段 A・階段 B・EV ホール）。縦シャフト = 縦シャフトの位置の並び（PS は区画ごと、最後に EPS・DS）。
//   廊下 = 主の廊下の 1 件。住戸 = 住戸の区画候補（画面に描く区画。完全な区画の数＝住戸数とは別）。部屋 = 結果の部屋。どれも結果の並びのまま。
// 仕様 1a（P3 が画面に描くものと同じ。画面を開いて知った規則）: P3 の画面は、入力欄（幅・奥行・廊下・住戸の奥行・スパン・廊下タイプ）から candidateCells で区画を作って描く。
//   外形 = 原点から 幅 × 奥行 の矩形の 1 件。通り芯 = gridLines(奥行, スパン)。廊下 = candidateCells の全廊下（ツインだけ 2 本）。住戸 = candidateCells の全区画。
//   自動作成の結果だけから作る P4 でも、廊下タイプ 4 種類（中廊下・片廊下・階段室・ツイン）のどれでも同じにする。
// 仕様 2（筆界）: P1 の筆界は P3 にまだ入らないので 0 件（仮置き）。
// 仕様 3（外形）: 建物の外形は 1 件。中身は未配線（仮置き）。
// 仕様 4（通り芯）: 柱割りの位置（mm）の並び。奥行方向に、端から昇順で、スパン数 + 1 本。区画の境目はすべて通り芯の上にある（区画は柱割りに従う）。
// 仕様 5（柱・壁・開口）: データが無いので、結果がそろっていても件数 0 のまま（入力に含めない）。
// 仕様 6（結果が無い）: 自動作成の前（null・未指定）は、どの種類の入力も空の配列で、件数は全部 0。中身は「なし」（什器は、渡されていれば仕様 9a）。
// 仕様 7（部屋の数）: 結果があるとき、住戸の中身の「部屋の数」は未算定ではなく、区画ごとの部屋の数になる（部屋の入力も渡す）。
// 仕様 8（注記）: 自動作成の前（結果が無い）ときだけ、「自動作成の後に出ます」と注記する（P4 の左メニュー用）。
// 仕様 9（純粋）: 入力を書き換えない。同じ入力には同じ出力。前の呼び出しに左右されない。
// 仕様 9a（什器・仮置き。ハブ A-03 G69。P4 は渡す）: objectSourcesOfPlan(plan, fixtures) の第 2 引数に、P3 で置いた什器の一覧
//   （店舗の fixtures。置いた順）を渡すと、什器の入力になる。什器は自動作成の結果ではなく店舗のものなので、結果（plan）の有無によらず、
//   渡した什器がそのまま入る（P4 の什器の欄と同じ値）。区画なしの什器も落とさない。省略すると空の配列（件数 0）。
//   什器を渡しても、ほかの種類の入力は変わらない。
//
// 【P2 の 2D 平面から】objectSourcesOfFootprint(footprint, parcel)。外形（閉じた輪郭の頂点列）と仮の筆界（矩形）だけを持つ。
// 仕様 10（外形）: 閉じた輪郭（頂点が 3 つ以上）なら外形は 1 件。頂点の数ではなく輪郭の数を数える。閉じていない（null・未指定・頂点が 3 つ未満）なら 0 件。
// 仕様 11（筆界）: 仮の筆界（矩形）を渡せば筆界は 1 件。渡さなければ 0 件。
// 仕様 12（P2 に無いもの）: 通り芯・コア・縦シャフト・廊下・什器・住戸・部屋は P2 に無い（什器は P3 の道具で、P2 は渡さない）ので、空の配列（件数 0）。
// 仕様 13（中身）: 筆界・外形の中身は未配線（detailOfKind の「中身: 未配線」）。
// 仕様 14（結果が無い）: 外形も筆界も無ければ、自動作成の前の P3 と同じ（全部空）。
// 仕様 15（純粋）: 仕様 9 と同じ。
import { describe, expect, it } from 'vitest'
import type { Point } from '../geom/viewport'
import { generateAutoPlan } from './autoPlan'
import { candidateCells } from './candidateCells'
import { FIXTURE_ITEMS, type Fixture, type FixtureItem } from './fixtures'
import { gridLines } from './grid'
import { detailOfKind, type ObjectDetailSources } from './objectDetail'
import { countObjects, type ObjectKind } from './objectMenu'
import { noticeOfPlan, objectSourcesOfFootprint, objectSourcesOfPlan } from './objectSourcesOfPlan'

// 左メニューの 12 種類（什器は縦シャフト・廊下の後、住戸の前）
const KINDS: readonly ObjectKind[] = [
  'siteBoundary',
  'outline',
  'grid',
  'column',
  'core',
  'shaft',
  'corridor',
  'fixture',
  'unit',
  'wall',
  'opening',
  'room',
]
const NOTED = ['column', 'wall', 'opening']
const NONE = 'なし'
const MEANING = '意味づけの結果: 未配線'
const NOT_WIRED = '中身: 未配線'

// 品目は名前で引く（品目の ID は仮置きなので、試験に書かない）
function itemOf(label: string): FixtureItem {
  const found = FIXTURE_ITEMS.find((i) => i.label === label)
  if (!found) throw new Error(`品目「${label}」が無い`)
  return found.id
}
const kitchen = itemOf('キッチン')
const toilet = itemOf('便器')
const storage = itemOf('収納')
const fx = (id: string, item: FixtureItem, unitId: string | null): Fixture => ({ id, item, unitId })
// P3 で置いた什器 4 件（置いた順。区画なし 1 件、いまの区画に無い区画 ZZ が 1 件。id は連番とは限らない）。中廊下の区画は L0〜L3・R0〜R3
const FIXTURES: Fixture[] = [fx('fixture-1', kitchen, 'L0'), fx('fixture-2', toilet, 'R3'), fx('fixture-3', storage, null), fx('fixture-5', kitchen, 'ZZ')]

// 自動作成の入力（autoPlan.test.ts の仕様と同じ値）
const BASE = {
  targetPerFloor: 7,
  storeyCount: 5,
  storeyHeightMm: 3000,
  spanMm: 6000,
  unitDepthMm: 6000,
  corridorMm: 1600,
  evCount: 2,
  evStops: [1, 2, 3, 4, 5],
}
// 中廊下: 目標 7 戸 → 4 スパン・8 区画（L0〜L3 と R0〜R3）。各区画 6000 × 6000、各 4 室で 32 室。奥行 24000
const MID = generateAutoPlan({ ...BASE, layout: '中廊下' })
// 片廊下: 目標 5 戸 → 5 スパン・5 区画（L0〜L4）。各 4 室で 20 室。奥行 30000
const SIDE = generateAutoPlan({ ...BASE, targetPerFloor: 5, layout: '片廊下' })

type Sources = ObjectDetailSources
const countsOf = (s: Sources): Record<string, number> => Object.fromEntries(countObjects(s).map((r) => [r.kind, r.count]))
const zeroCounts: Record<string, number> = Object.fromEntries(KINDS.map((k) => [k, 0]))
// 件数が 0 でない種類だけを書く
const withCounts = (nonZero: Partial<Record<ObjectKind, number>>): Record<string, number> => ({ ...zeroCounts, ...nonZero })
const titlesOf = (kind: ObjectKind, s: Sources): string[] => detailOfKind(kind, s).entries.map((e) => e.title)
const linesOf = (kind: ObjectKind, s: Sources): string[][] => detailOfKind(kind, s).entries.map((e) => e.lines)

function deepFreeze<T>(o: T): T {
  if (o !== null && typeof o === 'object') {
    Object.freeze(o)
    for (const v of Object.values(o)) deepFreeze(v)
  }
  return o
}

describe('objectSourcesOfPlan（種類ごとの入力。仕様 1〜5・7）', () => {
  it('中廊下（4 スパン・8 区画）の件数: 筆界 0・外形 1・通り芯 5・コア 3・縦シャフト 10・廊下 1・住戸 8・部屋 32', () => {
    expect(countsOf(objectSourcesOfPlan(MID))).toEqual(
      withCounts({ outline: 1, grid: 5, core: 3, shaft: 10, corridor: 1, unit: 8, room: 32 }),
    )
  })

  it('片廊下（5 スパン・5 区画）の件数: 通り芯 6・縦シャフト 7・住戸 5・部屋 20（ほかは中廊下と同じ）', () => {
    expect(countsOf(objectSourcesOfPlan(SIDE))).toEqual(
      withCounts({ outline: 1, grid: 6, core: 3, shaft: 7, corridor: 1, unit: 5, room: 20 }),
    )
  })

  it('コアは結果のコア 3 つ（階段 A・階段 B・EV ホール）で、結果の並びのまま', () => {
    expect(titlesOf('core', objectSourcesOfPlan(MID))).toEqual(['コア stairA', 'コア stairB', 'コア evHall'])
  })

  it('縦シャフトは位置の並び（区画ごとの PS、最後に EPS・DS）で、結果の並びのまま', () => {
    const titles = titlesOf('shaft', objectSourcesOfPlan(MID))
    expect(titles.slice(0, MID.cells.length)).toEqual(MID.cells.map((c) => `縦シャフト PS-${c.id}`))
    expect(titles.slice(-2)).toEqual(['縦シャフト EPS', '縦シャフト DS'])
  })

  it('廊下は主の廊下の 1 件（中廊下は幅 1600 × 奥行 24000、片廊下は幅 1600 × 奥行 30000）', () => {
    expect(linesOf('corridor', objectSourcesOfPlan(MID)).map((l) => l[0])).toEqual(['寸法: 1600 × 24000 mm'])
    expect(linesOf('corridor', objectSourcesOfPlan(SIDE)).map((l) => l[0])).toEqual(['寸法: 1600 × 30000 mm'])
  })

  it('住戸は区画候補（画面に描く区画）で、結果の並びのまま。面積は 1 区画 6000 × 6000 = 36.0 m²', () => {
    const s = objectSourcesOfPlan(MID)
    expect(titlesOf('unit', s)).toEqual(MID.cells.map((c) => `住戸 ${c.id}`))
    expect(linesOf('unit', s).map((l) => l[0])).toEqual(MID.cells.map(() => '面積: 36.0 m²'))
  })

  it('住戸の「部屋の数」は未算定ではなく、区画ごとの 4（部屋の入力も渡している）', () => {
    expect(linesOf('unit', objectSourcesOfPlan(MID)).map((l) => l[1])).toEqual(MID.cells.map(() => '部屋の数: 4'))
    expect(linesOf('unit', objectSourcesOfPlan(SIDE)).map((l) => l[1])).toEqual(SIDE.cells.map(() => '部屋の数: 4'))
  })

  it('部屋は結果の部屋で、結果の並びのまま', () => {
    expect(titlesOf('room', objectSourcesOfPlan(MID))).toEqual(MID.rooms.map((r) => `部屋 ${r.id}`))
  })

  it('筆界は 0 件（P1 の筆界は P3 にまだ入らない。仮置き）で、中身は「なし」', () => {
    for (const plan of [MID, SIDE]) {
      const s = objectSourcesOfPlan(plan)
      expect(s.siteBoundaries).toEqual([])
      expect(detailOfKind('siteBoundary', s).emptyText).toBe(NONE)
    }
  })

  it('外形は 1 件で、中身は未配線（仮置き）', () => {
    for (const plan of [MID, SIDE]) {
      expect(linesOf('outline', objectSourcesOfPlan(plan))).toEqual([[NOT_WIRED, MEANING, 'レイヤー: 外形']])
    }
  })

  it('通り芯は柱割りの位置（mm）の昇順で、奥行方向にスパン数 + 1 本（端から 0 で始まり、奥行で終わる）', () => {
    expect(objectSourcesOfPlan(MID).gridLines).toEqual([0, 6000, 12000, 18000, 24000])
    expect(objectSourcesOfPlan(SIDE).gridLines).toEqual([0, 6000, 12000, 18000, 24000, 30000])
    expect(linesOf('grid', objectSourcesOfPlan(MID)).map((l) => l[0])).toEqual([
      '位置: 0 mm',
      '位置: 6000 mm',
      '位置: 12000 mm',
      '位置: 18000 mm',
      '位置: 24000 mm',
    ])
  })

  it('区画の境目（y0・y1）はすべて通り芯の上にある（区画は柱割りに従う）', () => {
    for (const plan of [MID, SIDE]) {
      const grid = objectSourcesOfPlan(plan).gridLines ?? []
      for (const c of plan.cells) {
        expect(grid, `${c.id} の y0`).toContain(c.y0)
        expect(grid, `${c.id} の y1`).toContain(c.y1)
      }
    }
  })

  it('柱・壁・開口は、結果がそろっていても件数 0 のまま（入力に含めない）で、注記は付かない', () => {
    const rows = countObjects(objectSourcesOfPlan(MID))
    for (const kind of NOTED) {
      const row = rows.find((r) => r.kind === kind)
      expect(row?.count, kind).toBe(0)
      expect(row?.note, kind).toBeUndefined()
    }
    expect(rows.filter((r) => r.note !== undefined).map((r) => r.kind)).toEqual([])
  })
})

// 廊下タイプ 4 種類と、目標の戸数（1 階あたり）。中廊下・階段室は 1 スパン 2 戸、片廊下・ツインは 1 スパン 1 戸
const LAYOUTS = [
  ['中廊下', 7],
  ['片廊下', 5],
  ['階段室', 7],
  ['ツイン', 5],
] as const

describe('objectSourcesOfPlan（P3 が画面に描くものと同じ。廊下タイプ 4 種類。仕様 1a）', () => {
  for (const [layout, target] of LAYOUTS) {
    describe(layout, () => {
      const plan = generateAutoPlan({ ...BASE, targetPerFloor: target, layout })
      // P3 の画面が描くもの = candidateCells に、画面の入力（幅・奥行・廊下・住戸の奥行・スパン・廊下タイプ）を渡した結果
      const drawn = candidateCells({
        width_mm: plan.widthMm,
        depth_mm: plan.depthMm,
        corridor_mm: BASE.corridorMm,
        unit_depth_mm: BASE.unitDepthMm,
        span_mm: BASE.spanMm,
        layout,
      })
      const s = objectSourcesOfPlan(plan)

      it('廊下は candidateCells の全廊下（ツインだけ 2 本、ほかは 1 本）', () => {
        expect(s.corridors).toEqual(drawn.corridors)
        expect(countsOf(s).corridor).toBe(layout === 'ツイン' ? 2 : 1)
      })

      it('住戸は candidateCells の全区画で、結果の区画と同じ', () => {
        expect(s.units).toEqual(drawn.cells)
        expect(s.units).toEqual(plan.cells)
        expect(countsOf(s).unit).toBe(plan.cells.length)
      })

      it('通り芯は gridLines(奥行, スパン)', () => {
        expect(s.gridLines).toEqual(gridLines(plan.depthMm, BASE.spanMm))
      })

      it('外形は原点から 幅 × 奥行 の矩形の 1 件', () => {
        expect(s.outlines).toEqual([{ x0: 0, y0: 0, x1: plan.widthMm, y1: plan.depthMm }])
      })

      it('コア・縦シャフト・部屋は結果のまま', () => {
        expect(s.cores).toEqual(plan.cores)
        expect(s.shafts).toEqual(plan.shaftRects)
        expect(s.rooms).toEqual(plan.rooms)
      })
    })
  }
})

describe('objectSourcesOfPlan（結果が無いとき。仕様 6）', () => {
  const EMPTY: Sources = {
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

  it('結果が無い（null）なら、どの種類の入力も空の配列', () => {
    expect(objectSourcesOfPlan(null)).toEqual(EMPTY)
  })

  it('結果が未指定（undefined）でも同じ', () => {
    expect(objectSourcesOfPlan(undefined)).toEqual(EMPTY)
  })

  it('件数は全部 0（12 種類）で、注記は付かない', () => {
    const rows = countObjects(objectSourcesOfPlan(null))
    expect(rows).toHaveLength(12)
    expect(rows.map((r) => r.count)).toEqual(new Array(12).fill(0))
    expect(rows.filter((r) => r.note !== undefined).map((r) => r.kind)).toEqual([])
  })

  it('どの種類を選んでも、中身は空で「なし」と出す', () => {
    const s = objectSourcesOfPlan(null)
    for (const kind of KINDS) {
      const d = detailOfKind(kind, s)
      expect(d.entries, kind).toEqual([])
      expect(d.emptyText, kind).toBe(NONE)
    }
  })
})

describe('noticeOfPlan（自動作成の前の注記。仕様 8）', () => {
  it('結果が無い（null・未指定）とき、「自動作成の後に出ます」と注記する', () => {
    expect(noticeOfPlan(null)).toBe('自動作成の後に出ます')
    expect(noticeOfPlan(undefined)).toBe('自動作成の後に出ます')
  })

  it('結果があるときは、注記しない', () => {
    expect(noticeOfPlan(MID)).toBeUndefined()
    expect(noticeOfPlan(SIDE)).toBeUndefined()
  })
})

describe('objectSourcesOfPlan（什器。仕様 9a）', () => {
  it('什器を渡さなければ、什器は 0 件（空の配列）で、中身は「なし」', () => {
    for (const plan of [MID, SIDE]) {
      const s = objectSourcesOfPlan(plan)
      expect(s.fixtures).toEqual([])
      expect(countsOf(s).fixture).toBe(0)
      expect(detailOfKind('fixture', s).emptyText).toBe(NONE)
    }
  })

  it('渡した什器が置いた順にそのまま入り、件数は渡した数（区画なし・いまの区画に無い区画の什器も含む）', () => {
    const s = objectSourcesOfPlan(MID, FIXTURES)
    expect(s.fixtures).toEqual(FIXTURES)
    expect(countsOf(s)).toEqual(withCounts({ outline: 1, grid: 5, core: 3, shaft: 10, corridor: 1, fixture: 4, unit: 8, room: 32 }))
  })

  it('什器の中身は、見出し「什器 <id>」と、品目・区画（区画なしは「区画なし」）・意味づけの結果・レイヤー', () => {
    const s = objectSourcesOfPlan(MID, FIXTURES)
    expect(titlesOf('fixture', s)).toEqual(['什器 fixture-1', '什器 fixture-2', '什器 fixture-3', '什器 fixture-5'])
    expect(linesOf('fixture', s)).toEqual([
      ['品目: キッチン', '区画: L0', MEANING, 'レイヤー: その他'],
      ['品目: 便器', '区画: R3', MEANING, 'レイヤー: その他'],
      ['品目: 収納', '区画: 区画なし', MEANING, 'レイヤー: その他'],
      ['品目: キッチン', '区画: 区画なし', MEANING, 'レイヤー: その他'],
    ])
  })

  it('什器を渡しても、什器以外の入力は変わらない（廊下タイプ 4 種類）', () => {
    for (const [layout, target] of LAYOUTS) {
      const plan = generateAutoPlan({ ...BASE, targetPerFloor: target, layout })
      expect({ ...objectSourcesOfPlan(plan, FIXTURES), fixtures: [] }).toEqual(objectSourcesOfPlan(plan))
    }
  })

  it('結果が無い（null・未指定）ときも、渡した什器は入る（什器は店舗のもの）。ほかの種類は空のまま', () => {
    for (const plan of [null, undefined]) {
      const s = objectSourcesOfPlan(plan, FIXTURES)
      expect(s).toEqual({ ...objectSourcesOfPlan(null), fixtures: FIXTURES })
      expect(countsOf(s)).toEqual(withCounts({ fixture: 4 }))
    }
  })

  it('什器を空の配列で渡しても、渡さないときと同じ', () => {
    expect(objectSourcesOfPlan(MID, [])).toEqual(objectSourcesOfPlan(MID))
    expect(objectSourcesOfPlan(null, [])).toEqual(objectSourcesOfPlan(null))
  })
})

describe('objectSourcesOfPlan（純粋。仕様 9）', () => {
  it('入力を書き換えない（凍結した結果でも動き、中身が変わらず、件数も同じ）', () => {
    const frozen = deepFreeze(structuredClone(MID))
    const before = JSON.stringify(frozen)
    expect(() => objectSourcesOfPlan(frozen)).not.toThrow()
    expect(JSON.stringify(frozen)).toBe(before)
    expect(countsOf(objectSourcesOfPlan(frozen))).toEqual(countsOf(objectSourcesOfPlan(MID)))
  })

  it('同じ入力には同じ出力で、前の呼び出しに左右されない', () => {
    const first = objectSourcesOfPlan(MID)
    objectSourcesOfPlan(SIDE)
    objectSourcesOfPlan(null)
    expect(objectSourcesOfPlan(MID)).toEqual(first)
    expect(countsOf(first)).toEqual(withCounts({ outline: 1, grid: 5, core: 3, shaft: 10, corridor: 1, unit: 8, room: 32 }))
  })

  it('什器を渡しても、凍結した入力を書き換えず、件数と中身も同じ', () => {
    const frozenPlan = deepFreeze(structuredClone(MID))
    const frozenFixtures = deepFreeze(structuredClone(FIXTURES))
    const before = JSON.stringify([frozenPlan, frozenFixtures])
    expect(() => objectSourcesOfPlan(frozenPlan, frozenFixtures)).not.toThrow()
    expect(JSON.stringify([frozenPlan, frozenFixtures])).toBe(before)
    expect(objectSourcesOfPlan(frozenPlan, frozenFixtures)).toEqual(objectSourcesOfPlan(MID, FIXTURES))
  })
})

// 閉じた輪郭（closure.footprint の形。頂点を順にたどり、最初の頂点を最後に繰り返さない）
const SQUARE: Point[] = [
  { x: 0, y: 0 },
  { x: 10_000, y: 0 },
  { x: 10_000, y: 8_000 },
  { x: 0, y: 8_000 },
]
const HEXAGON: Point[] = [
  { x: 0, y: 0 },
  { x: 6_000, y: 0 },
  { x: 9_000, y: 5_000 },
  { x: 6_000, y: 10_000 },
  { x: 0, y: 10_000 },
  { x: -3_000, y: 5_000 },
]
// 仮の筆界（矩形）
const PARCEL = { x0: -2_000, y0: -2_000, x1: 12_000, y1: 10_000 }

describe('objectSourcesOfFootprint（P2 の外形。仕様 10）', () => {
  it('閉じた輪郭（四角形）なら、外形は 1 件', () => {
    const s = objectSourcesOfFootprint(SQUARE, undefined)
    expect(s.outlines).toHaveLength(1)
    expect(countsOf(s)).toEqual(withCounts({ outline: 1 }))
  })

  it('頂点が 6 つの輪郭でも、外形は 1 件（頂点の数ではなく輪郭の数を数える）', () => {
    expect(countsOf(objectSourcesOfFootprint(HEXAGON, undefined))).toEqual(withCounts({ outline: 1 }))
  })

  it('閉じていない（null・未指定）なら、外形は 0 件', () => {
    expect(objectSourcesOfFootprint(null, undefined).outlines).toEqual([])
    expect(objectSourcesOfFootprint(undefined, undefined).outlines).toEqual([])
    expect(countsOf(objectSourcesOfFootprint(null, undefined))).toEqual(withCounts({}))
  })

  it('頂点が 3 つ未満（空・1 点・2 点）は面にならないので、外形は 0 件', () => {
    for (const pts of [[], SQUARE.slice(0, 1), SQUARE.slice(0, 2)]) {
      expect(objectSourcesOfFootprint(pts, undefined).outlines, `${pts.length} 点`).toEqual([])
    }
  })

  it('頂点が 3 つ（三角形）なら、外形は 1 件', () => {
    expect(objectSourcesOfFootprint(SQUARE.slice(0, 3), undefined).outlines).toHaveLength(1)
  })
})

describe('objectSourcesOfFootprint（P2 の仮の筆界。仕様 11）', () => {
  it('仮の筆界（矩形）を渡せば、筆界は 1 件', () => {
    const s = objectSourcesOfFootprint(null, PARCEL)
    expect(s.siteBoundaries).toHaveLength(1)
    expect(countsOf(s)).toEqual(withCounts({ siteBoundary: 1 }))
  })

  it('筆界は、外形が閉じていなくても 1 件（外形とは別に数える）', () => {
    expect(countsOf(objectSourcesOfFootprint(null, PARCEL)).siteBoundary).toBe(1)
    expect(countsOf(objectSourcesOfFootprint(SQUARE, PARCEL)).siteBoundary).toBe(1)
  })

  it('渡さなければ（null・未指定）、筆界は 0 件', () => {
    expect(objectSourcesOfFootprint(SQUARE, null).siteBoundaries).toEqual([])
    expect(objectSourcesOfFootprint(SQUARE, undefined).siteBoundaries).toEqual([])
    expect(objectSourcesOfFootprint(SQUARE).siteBoundaries).toEqual([])
  })

  it('外形と仮の筆界がそろえば、筆界 1・外形 1・ほかは 0', () => {
    expect(countsOf(objectSourcesOfFootprint(SQUARE, PARCEL))).toEqual(withCounts({ siteBoundary: 1, outline: 1 }))
  })
})

describe('objectSourcesOfFootprint（P2 に無いもの・中身。仕様 12〜14）', () => {
  it('通り芯・コア・縦シャフト・廊下・什器・住戸・部屋は、空の配列（件数 0。P2 は什器を渡さない）', () => {
    const s = objectSourcesOfFootprint(SQUARE, PARCEL)
    expect(s.gridLines).toEqual([])
    expect(s.cores).toEqual([])
    expect(s.shafts).toEqual([])
    expect(s.corridors).toEqual([])
    expect(s.fixtures).toEqual([])
    expect(s.units).toEqual([])
    expect(s.rooms).toEqual([])
  })

  it('柱・壁・開口は 0 件のまま、どの種類にも注記は付かない', () => {
    const rows = countObjects(objectSourcesOfFootprint(SQUARE, PARCEL))
    expect(rows).toHaveLength(12)
    expect(rows.filter((r) => r.note !== undefined).map((r) => r.kind)).toEqual([])
  })

  it('筆界・外形の中身は、1 件ずつ「中身: 未配線」（意味づけの結果とレイヤーが付く）', () => {
    const s = objectSourcesOfFootprint(SQUARE, PARCEL)
    expect(linesOf('siteBoundary', s)).toEqual([[NOT_WIRED, MEANING, 'レイヤー: 筆界']])
    expect(linesOf('outline', s)).toEqual([[NOT_WIRED, MEANING, 'レイヤー: 外形']])
  })

  it('P2 に無い種類を選んでも、中身は空で「なし」と出す', () => {
    const s = objectSourcesOfFootprint(SQUARE, PARCEL)
    for (const kind of ['grid', 'column', 'core', 'shaft', 'corridor', 'fixture', 'unit', 'wall', 'opening', 'room'] as const) {
      const d = detailOfKind(kind, s)
      expect(d.entries, kind).toEqual([])
      expect(d.emptyText, kind).toBe(NONE)
    }
  })

  it('外形も筆界も無ければ、自動作成の前の P3 と同じ（全部空）', () => {
    expect(objectSourcesOfFootprint(null, undefined)).toEqual(objectSourcesOfPlan(null))
    expect(objectSourcesOfFootprint(undefined, null)).toEqual(objectSourcesOfPlan(undefined))
  })
})

describe('objectSourcesOfFootprint（純粋。仕様 15）', () => {
  it('入力を書き換えない（凍結した輪郭と筆界でも動き、中身が変わらず、件数も同じ）', () => {
    const frozenOutline = deepFreeze(structuredClone(HEXAGON))
    const frozenParcel = deepFreeze(structuredClone(PARCEL))
    const before = JSON.stringify([frozenOutline, frozenParcel])
    expect(() => objectSourcesOfFootprint(frozenOutline, frozenParcel)).not.toThrow()
    expect(JSON.stringify([frozenOutline, frozenParcel])).toBe(before)
    expect(countsOf(objectSourcesOfFootprint(frozenOutline, frozenParcel))).toEqual(withCounts({ siteBoundary: 1, outline: 1 }))
  })

  it('同じ入力には同じ出力で、前の呼び出しに左右されない', () => {
    const first = objectSourcesOfFootprint(SQUARE, PARCEL)
    objectSourcesOfFootprint(HEXAGON, null)
    objectSourcesOfFootprint(null, undefined)
    expect(objectSourcesOfFootprint(SQUARE, PARCEL)).toEqual(first)
    expect(countsOf(first)).toEqual(withCounts({ siteBoundary: 1, outline: 1 }))
  })
})
