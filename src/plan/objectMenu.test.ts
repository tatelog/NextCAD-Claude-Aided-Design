// 仕様: P3 の左メニュー（ハブ A-03 G55、D-04 共通部品「左メニュー」）。件数の数え方・注記は仮置き。
// 代表の決定（G55）: 「図面のとき左メニューは必須。オブジェクトが何で、どんな内容が入っているかを可視化する。」
// 仕様 1（種類と並び）: 一覧は 筆界・外形・通り芯・柱・コア・住戸・壁・開口・部屋 をこの順に並べる（D-04）。
//   P3 の自動作成の結果にある 縦シャフト・廊下 も種類として並べる（並ぶ位置は仮置き）。種類ごとに 1 行。
// 仕様 2（件数）: 件数は P3 の自動作成の結果（筆界・外形・通り芯・コア・縦シャフト・廊下・住戸・部屋）から、種類ごとに数える。
// 仕様 3（空）: 結果が無い（空・未指定）ときは、どの種類も 0。
// 仕様 4（意味づけ未配線）: 柱・壁・開口は P3 にデータが無い（意味づけは未配線）。P3 の結果がどうであれ件数は 0 で、「意味づけ未配線」と注記する。
// 仕様 5（注記の対象）: 注記が付くのは柱・壁・開口だけ。ほかの種類は、件数が 0 でも注記を付けない。
// 仕様 6（純粋）: 入力を書き換えない。同じ入力には同じ出力。前の呼び出しに左右されない。
// 今回やらない（未着手）: 種類の選択、選んだものの中身（区画・面積・部屋・壁と開口の数・意味づけの結果・レイヤー）の表示。
import { describe, expect, it } from 'vitest'
import { countObjects, type ObjectSources } from './objectMenu'

// n 個の要素（要素の形は件数に関係しない）
const items = (n: number): unknown[] => Array.from({ length: n }, (_, i) => ({ id: `o${i}` }))

// 種類ごとに件数がすべて違う入力（種類の取り違えを見つけるため）
const FULL: ObjectSources = {
  siteBoundaries: items(2),
  outlines: items(1),
  gridLines: items(7),
  cores: items(3),
  shafts: items(5),
  corridors: items(4),
  units: items(8),
  rooms: items(32),
}

// D-04 の並び（筆界・外形・通り芯・柱・コア・住戸・壁・開口・部屋）。[種類の ID, 名前]
const D04 = [
  ['siteBoundary', '筆界'],
  ['outline', '外形'],
  ['grid', '通り芯'],
  ['column', '柱'],
  ['core', 'コア'],
  ['unit', '住戸'],
  ['wall', '壁'],
  ['opening', '開口'],
  ['room', '部屋'],
] as const

// データが無い（意味づけは未配線）種類
const UNWIRED = ['column', 'wall', 'opening'] as const
const NOTE = '意味づけ未配線'

type Rows = ReturnType<typeof countObjects>
const rowOf = (rows: Rows, kind: string) => rows.find((r) => r.kind === kind)
const countsOf = (rows: Rows) => Object.fromEntries(rows.map((r) => [r.kind, r.count]))

function deepFreeze<T>(o: T): T {
  if (o !== null && typeof o === 'object') {
    Object.freeze(o)
    for (const v of Object.values(o)) deepFreeze(v)
  }
  return o
}

describe('countObjects（左メニューの種類と並び）', () => {
  it('筆界・外形・通り芯・柱・コア・住戸・壁・開口・部屋を、この順に並べる', () => {
    const rows = countObjects(FULL)
    const d04Kinds = D04.map(([id]) => id)
    // D-04 の 9 種類だけを取り出した並びが、仕様の並びと同じ
    expect(rows.map((r) => r.kind).filter((k) => (d04Kinds as readonly string[]).includes(k))).toEqual(d04Kinds)
  })

  it('各種類の名前が仕様の語（筆界・外形・通り芯・柱・コア・住戸・壁・開口・部屋）になる', () => {
    const rows = countObjects(FULL)
    expect(D04.map(([id]) => rowOf(rows, id)?.label)).toEqual(D04.map(([, label]) => label))
  })

  it('P3 の結果にある縦シャフトと廊下も、種類として並べる', () => {
    const rows = countObjects(FULL)
    expect(rowOf(rows, 'shaft')?.label).toBe('縦シャフト')
    expect(rowOf(rows, 'corridor')?.label).toBe('廊下')
  })

  it('種類ごとに 1 行で、重複しない（9 種類 + 縦シャフト・廊下 = 11 行）', () => {
    const kinds = countObjects(FULL).map((r) => r.kind)
    expect(kinds).toHaveLength(11)
    expect(new Set(kinds).size).toBe(11)
  })
})

describe('countObjects（件数の数え方）', () => {
  it('P3 の結果を種類ごとに数える（種類を取り違えない）', () => {
    expect(countsOf(countObjects(FULL))).toEqual({
      siteBoundary: 2,
      outline: 1,
      grid: 7,
      column: 0,
      core: 3,
      shaft: 5,
      corridor: 4,
      unit: 8,
      wall: 0,
      opening: 0,
      room: 32,
    })
  })

  it('通り芯の位置が数値の並びでも、1 本を 1 件と数える', () => {
    // 柱割り（grid）の通り芯は端からの位置（mm）の並び
    expect(rowOf(countObjects({ gridLines: [500, 3_500, 6_500, 9_500] }), 'grid')?.count).toBe(4)
  })

  it('結果が空なら、どの種類も 0（未指定でも空配列でも同じ）', () => {
    const empty: ObjectSources = {
      siteBoundaries: [],
      outlines: [],
      gridLines: [],
      cores: [],
      shafts: [],
      corridors: [],
      units: [],
      rooms: [],
    }
    for (const src of [{}, empty]) {
      const rows = countObjects(src)
      expect(rows).toHaveLength(11)
      expect(rows.map((r) => r.count)).toEqual(new Array(11).fill(0))
    }
    expect(countObjects(empty)).toEqual(countObjects({}))
  })

  it('結果の一部だけがあるとき、無い種類は 0 で数える', () => {
    const rows = countObjects({ units: items(3) })
    expect(rows).toHaveLength(11)
    expect(rowOf(rows, 'unit')?.count).toBe(3)
    expect(rows.filter((r) => r.kind !== 'unit').map((r) => r.count)).toEqual(new Array(10).fill(0))
  })
})

describe('countObjects（意味づけ未配線の注記）', () => {
  it('柱・壁・開口は、P3 の結果がそろっていても件数 0 で「意味づけ未配線」と注記する', () => {
    const rows = countObjects(FULL)
    for (const kind of UNWIRED) {
      const row = rowOf(rows, kind)
      expect(row, kind).toBeDefined()
      expect(row?.count, kind).toBe(0)
      expect(row?.note, kind).toBe(NOTE)
    }
  })

  it('柱・壁・開口は、結果が空でも件数 0 で「意味づけ未配線」と注記する', () => {
    const rows = countObjects({})
    for (const kind of UNWIRED) {
      expect(rowOf(rows, kind)?.count, kind).toBe(0)
      expect(rowOf(rows, kind)?.note, kind).toBe(NOTE)
    }
  })

  it('注記が付くのは柱・壁・開口だけ（結果がそろっているとき）', () => {
    const noted = countObjects(FULL).filter((r) => r.note !== undefined)
    expect(noted.map((r) => r.kind)).toEqual(['column', 'wall', 'opening'])
  })

  it('注記が付くのは柱・壁・開口だけ（件数が 0 の種類にも、他には注記を付けない）', () => {
    const noted = countObjects({}).filter((r) => r.note !== undefined)
    expect(noted.map((r) => r.kind)).toEqual(['column', 'wall', 'opening'])
  })
})

describe('countObjects（純粋）', () => {
  it('入力を書き換えない（凍結した入力でも動き、中身が変わらない）', () => {
    const frozen = deepFreeze(structuredClone(FULL))
    const before = JSON.stringify(frozen)
    expect(() => countObjects(frozen)).not.toThrow()
    expect(JSON.stringify(frozen)).toBe(before)
    // 凍結した入力でも数え方は同じ（11 行、住戸 8・部屋 32）
    const rows = countObjects(frozen)
    expect(rows).toHaveLength(11)
    expect(rowOf(rows, 'unit')?.count).toBe(8)
    expect(rowOf(rows, 'room')?.count).toBe(32)
  })

  it('同じ入力には同じ出力で、前の呼び出しに左右されない', () => {
    const first = countObjects(FULL)
    countObjects({ units: items(99) })
    countObjects({})
    expect(countObjects(FULL)).toEqual(first)
    expect(first).toHaveLength(11)
  })
})
