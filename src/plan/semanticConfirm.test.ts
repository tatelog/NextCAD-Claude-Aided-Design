// 仕様: P3 の右に出す「意味づけの確認」の純粋な計算（ハブ A-03 G9・G13・G14・G65、D-02 C2、D-04 共通部品「意味づけの結果表示」「要確認の修正」）。
// 仕様 1（G13 種類の名前）: 種類は壁・柱・梁・開口・通り芯・部屋・その他の 7 つ。名前は日本語で返す。
// 仕様 2（G9 対象）: 確認欄に出す線は F5（柱割り）と F9（間取り）の線だけ。F4（外形）の線は出さない。
// 仕様 3（行）: 行は線の並びのまま。各行は線の id・種類の名前（種類が無いときは「未分類」）・状態（未分類・要確認・確定）を持つ。
//   種類が無い線の状態は「未分類」。種類があれば、状態は割り当ての状態（確定・要確認）のまま。種類は要確認でも消えない。
// 仕様 4（件数）: 状態（未分類・要確認・確定）ごとの行数。行が無ければ 3 つとも 0。
// 仕様 5（G65 動いた線）: 前後で同じ id の線のうち、座標（x1・y1・x2・y2）または revision が変わったもの。
//   新しく増えた線と、消えた線は含めない。座標も revision も同じなら、ほかの項目だけの変化は動いたと言わない。
// 仕様 6: どの関数も、渡された線・割り当て・行を書き換えない。
import { describe, expect, it } from 'vitest'
import type { Segment, Stage } from '../model/schema'
import { KINDS, type Kind } from './semantic'
import {
  confirmRows,
  countByStatus,
  kindName,
  movedSegmentIds,
  statusName,
  type Assignment,
  type ConfirmRow,
  type ConfirmStatus,
} from './semanticConfirm'

const seg = (id: string, stage: Stage, over: Partial<Segment> = {}): Segment => ({
  id,
  x1: 0,
  y1: 0,
  x2: 1_000,
  y2: 0,
  start_node_id: `${id}-a`,
  end_node_id: `${id}-b`,
  snap: 'none',
  stage,
  revision: 1,
  curve: 'line',
  ...over,
})

const human = (kind: Kind, status: Assignment['status'] = 'confirmed'): Assignment => ({ kind, status, by: 'human' })

const freeze = <T extends object>(x: T): T => Object.freeze(x)

describe('種類の名前（kindName）', () => {
  const cases: [Kind, string][] = [
    ['wall', '壁'],
    ['column', '柱'],
    ['beam', '梁'],
    ['opening', '開口'],
    ['grid', '通り芯'],
    ['room', '部屋'],
    ['other', 'その他'],
  ]

  it.each(cases)('%s は「%s」', (kind, name) => {
    expect(kindName(kind)).toBe(name)
  })

  it('種類の 7 つ全部に名前があり、名前は重ならない', () => {
    const names = KINDS.map((k) => kindName(k))
    expect(names).toHaveLength(7)
    for (const n of names) expect(n.length).toBeGreaterThan(0)
    expect(new Set(names).size).toBe(7)
  })
})

describe('状態の名前（statusName）', () => {
  const cases: [ConfirmStatus, string][] = [
    ['unclassified', '未分類'],
    ['needs_review', '要確認'],
    ['confirmed', '確定'],
  ]

  it.each(cases)('%s は「%s」', (status, name) => {
    expect(statusName(status)).toBe(name)
  })
})

describe('confirmRows（確認欄の行）', () => {
  it('F5 と F9 の線だけが行になる。F4（外形）の線は出ない', () => {
    const rows = confirmRows([seg('o1', 'F4'), seg('c1', 'F5'), seg('r1', 'F9'), seg('o2', 'F4')], {})
    expect(rows.map((r) => r.id)).toEqual(['c1', 'r1'])
  })

  it('行は線の並びのまま。F4 が挟まっても、F5 と F9 が混ざっていても並べ替えない', () => {
    const rows = confirmRows(
      [seg('z9', 'F9'), seg('o1', 'F4'), seg('b5', 'F5'), seg('a9', 'F9'), seg('o2', 'F4'), seg('c5', 'F5')],
      {},
    )
    expect(rows.map((r) => r.id)).toEqual(['z9', 'b5', 'a9', 'c5'])
  })

  it('割り当ての無い線は、種類の名前も状態も「未分類」', () => {
    const [row] = confirmRows([seg('c1', 'F5')], {})
    expect(row).toEqual({ id: 'c1', kind: null, kindName: '未分類', status: 'unclassified' })
  })

  it('確定の割り当て: 種類の名前は日本語の名前、状態は確定', () => {
    const [row] = confirmRows([seg('c1', 'F5')], { c1: human('wall') })
    expect(row).toEqual({ id: 'c1', kind: 'wall', kindName: '壁', status: 'confirmed' })
  })

  it('要確認の割り当て: 種類は消えずに残り、状態だけが要確認', () => {
    const [row] = confirmRows([seg('r1', 'F9')], { r1: human('room', 'needs_review') })
    expect(row).toEqual({ id: 'r1', kind: 'room', kindName: '部屋', status: 'needs_review' })
  })

  it('割り当てがある線とない線が混ざっても、線ごとに自分の割り当てが当たる', () => {
    const rows = confirmRows([seg('a', 'F5'), seg('b', 'F5'), seg('c', 'F9')], {
      a: human('column'),
      c: human('beam', 'needs_review'),
    })
    expect(rows.map((r) => [r.id, r.kindName, r.status])).toEqual([
      ['a', '柱', 'confirmed'],
      ['b', '未分類', 'unclassified'],
      ['c', '梁', 'needs_review'],
    ])
  })

  it('割り当てが誰によるもの（人・Claude）でも、行の種類と状態は割り当てのまま', () => {
    const [row] = confirmRows([seg('c1', 'F5')], { c1: { kind: 'opening', status: 'needs_review', by: 'claude' } })
    expect(row).toEqual({ id: 'c1', kind: 'opening', kindName: '開口', status: 'needs_review' })
  })

  it('F4 の線に割り当てがあっても、行には出さない（対象外）', () => {
    const rows = confirmRows([seg('o1', 'F4'), seg('c1', 'F5')], { o1: human('wall') })
    expect(rows.map((r) => r.id)).toEqual(['c1'])
  })

  it('いまの線に無い id の割り当て（消えた線の分）は、行を増やさない', () => {
    const rows = confirmRows([seg('c1', 'F5')], { gone: human('wall'), c1: human('column') })
    expect(rows.map((r) => r.id)).toEqual(['c1'])
  })

  it('線が無ければ行も無い', () => {
    expect(confirmRows([], {})).toEqual([])
    expect(confirmRows([], { x: human('wall') })).toEqual([])
  })

  it('F4 の線しか無ければ行は無い', () => {
    expect(confirmRows([seg('o1', 'F4'), seg('o2', 'F4')], {})).toEqual([])
  })

  it('渡した線と割り当てを書き換えない', () => {
    const segments = freeze([freeze(seg('o1', 'F4')), freeze(seg('c1', 'F5')), freeze(seg('r1', 'F9'))])
    const assignments = freeze({ c1: freeze(human('wall')), r1: freeze(human('room', 'needs_review')) })
    expect(() => confirmRows(segments, assignments)).not.toThrow()
    expect(segments.map((s) => s.id)).toEqual(['o1', 'c1', 'r1'])
    expect(assignments.c1).toEqual({ kind: 'wall', status: 'confirmed', by: 'human' })
  })
})

describe('countByStatus（状態ごとの件数）', () => {
  const row = (id: string, status: ConfirmStatus): ConfirmRow => ({
    id,
    kind: status === 'unclassified' ? null : 'wall',
    kindName: status === 'unclassified' ? '未分類' : '壁',
    status,
  })

  it('未分類・要確認・確定の行数を、それぞれ数える', () => {
    const rows = [
      row('a', 'unclassified'),
      row('b', 'confirmed'),
      row('c', 'needs_review'),
      row('d', 'confirmed'),
      row('e', 'unclassified'),
      row('f', 'confirmed'),
    ]
    expect(countByStatus(rows)).toEqual({ unclassified: 2, needs_review: 1, confirmed: 3 })
  })

  it('行が無いときは、3 つとも 0', () => {
    expect(countByStatus([])).toEqual({ unclassified: 0, needs_review: 0, confirmed: 0 })
  })

  it('1 つの状態しか無くても、ほかの 2 つのキーは 0 で持つ', () => {
    expect(countByStatus([row('a', 'needs_review')])).toEqual({ unclassified: 0, needs_review: 1, confirmed: 0 })
  })

  it('3 つの件数の合計は行数に等しい', () => {
    const rows = [row('a', 'unclassified'), row('b', 'needs_review'), row('c', 'confirmed'), row('d', 'confirmed')]
    const n = countByStatus(rows)
    expect(n.unclassified + n.needs_review + n.confirmed).toBe(rows.length)
  })

  it('confirmRows の結果をそのまま数えられる', () => {
    const rows = confirmRows([seg('o1', 'F4'), seg('a', 'F5'), seg('b', 'F5'), seg('c', 'F9')], {
      a: human('column'),
      c: human('room', 'needs_review'),
    })
    expect(countByStatus(rows)).toEqual({ unclassified: 1, needs_review: 1, confirmed: 1 })
  })

  it('渡した行を書き換えない', () => {
    const rows = freeze([freeze(row('a', 'confirmed')), freeze(row('b', 'unclassified'))])
    expect(() => countByStatus(rows)).not.toThrow()
    expect(rows).toHaveLength(2)
  })
})

describe('movedSegmentIds（動いた線）', () => {
  const sorted = (ids: string[]) => [...ids].sort()

  it.each([['x1'], ['y1'], ['x2'], ['y2']] as const)('座標 %s が変わった線は、動いた線に入る', (field) => {
    const before = [seg('a', 'F5'), seg('b', 'F5')]
    const after = [seg('a', 'F5'), seg('b', 'F5', { [field]: 500 })]
    expect(movedSegmentIds(before, after)).toEqual(['b'])
  })

  it('座標が同じで revision だけ変わった線も、動いた線に入る', () => {
    const before = [seg('a', 'F5', { revision: 1 })]
    const after = [seg('a', 'F5', { revision: 2 })]
    expect(movedSegmentIds(before, after)).toEqual(['a'])
  })

  it('座標も revision も同じ線は、動いた線に入らない', () => {
    const before = [seg('a', 'F5'), seg('b', 'F9')]
    const after = [seg('a', 'F5'), seg('b', 'F9')]
    expect(movedSegmentIds(before, after)).toEqual([])
  })

  it('動いた線だけを返す。動かない線は混ぜない', () => {
    const before = [seg('a', 'F5'), seg('b', 'F5'), seg('c', 'F9'), seg('d', 'F9')]
    const after = [seg('a', 'F5', { x2: 2_000 }), seg('b', 'F5'), seg('c', 'F9', { revision: 3 }), seg('d', 'F9')]
    expect(sorted(movedSegmentIds(before, after))).toEqual(['a', 'c'])
  })

  it('前に無くて、後に増えた線は含めない', () => {
    const before = [seg('a', 'F5')]
    const after = [seg('a', 'F5'), seg('new', 'F5', { x1: 777 })]
    expect(movedSegmentIds(before, after)).toEqual([])
  })

  it('前に有って、後に消えた線は含めない', () => {
    const before = [seg('a', 'F5'), seg('gone', 'F5')]
    const after = [seg('a', 'F5')]
    expect(movedSegmentIds(before, after)).toEqual([])
  })

  it('増えた線と消えた線が有っても、動いた線だけが残る', () => {
    const before = [seg('a', 'F5'), seg('gone', 'F9'), seg('b', 'F9')]
    const after = [seg('a', 'F5', { y1: 10 }), seg('b', 'F9'), seg('new', 'F5')]
    expect(movedSegmentIds(before, after)).toEqual(['a'])
  })

  it('前後で並びが違っても、同じ id どうしで比べる', () => {
    const before = [seg('a', 'F5'), seg('b', 'F5')]
    const after = [seg('b', 'F5', { x1: 1 }), seg('a', 'F5')]
    expect(movedSegmentIds(before, after)).toEqual(['b'])
  })

  it('座標も revision も同じなら、ほかの項目（snap・stage など）だけの変化は動いたと言わない', () => {
    const before = [seg('a', 'F5', { snap: 'none' }), seg('b', 'F5')]
    const after = [seg('a', 'F5', { snap: 'grid' }), seg('b', 'F9', { semantic_object_id: 'so-1' })]
    expect(movedSegmentIds(before, after)).toEqual([])
  })

  it('前後とも空なら空', () => {
    expect(movedSegmentIds([], [])).toEqual([])
  })

  it('前が空で後だけ有るとき（全部が増えた線）は空', () => {
    expect(movedSegmentIds([], [seg('a', 'F5')])).toEqual([])
  })

  it('後が空のとき（全部が消えた線）は空', () => {
    expect(movedSegmentIds([seg('a', 'F5')], [])).toEqual([])
  })

  it('同じ id が重ならずに、1 回ずつ返る', () => {
    const before = [seg('a', 'F5'), seg('b', 'F5'), seg('c', 'F5')]
    const after = [seg('a', 'F5', { x1: 1 }), seg('b', 'F5', { x2: 2, revision: 2 }), seg('c', 'F5', { y2: 3 })]
    const ids = movedSegmentIds(before, after)
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
  })

  it('渡した前後の線を書き換えない', () => {
    const before = freeze([freeze(seg('a', 'F5')), freeze(seg('b', 'F5'))])
    const after = freeze([freeze(seg('b', 'F5', { x1: 5 })), freeze(seg('a', 'F5'))])
    expect(() => movedSegmentIds(before, after)).not.toThrow()
    expect(before.map((s) => s.id)).toEqual(['a', 'b'])
    expect(after.map((s) => s.id)).toEqual(['b', 'a'])
  })
})
