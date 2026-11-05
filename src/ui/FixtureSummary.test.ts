// 仕様（ハブ A-03 G69、D-04 P3・P4）: P3 で置いた什器は P4 の数量に結ぶ。P4 に「什器（平面で置いたもの）」の欄を出す。文言は仮置き。
// props: fixtures（置いた什器）、unitIds（いま P3 にある区画の id。省略できる）。状態は持たない。
// 仕様 1（欄）: 見出し「什器（平面で置いたもの）」の欄を出す。
// 仕様 2（種類ごと）: 5 品目それぞれ 1 行で、名前・件数（台）・「単価: 未確定」を、品目の並び（キッチン・ユニットバス・洗面・便器・収納）で出す。
//   置いていない品目は 0 台。
// 仕様 3（区画なし）: 区画なしの件数があれば、最後に「区画なし」の行（件数つき）を足す。無ければ出さない。
//   区画なしは、区画の指定が無い什器と、unitIds に無い区画の什器（落とさず数える）。unitIds を渡さなければ、区画の指定が無い什器だけ。
//   品目ごとの件数に入れるのは、区画の指定がある什器だけ。
// 仕様 4（工事原価に入れない）: 注記で、什器は単価が決まるまで、工事原価（概算）の合計には入れない、と明記する。
// 仕様 5（描ける）: サーバー側の描画で例外が出ない。
// 追加の props（G69 の今回の決定。文言は仮置き）: unitPriceTexts（品目ごとの単価の入力欄の文字。省略できる）、
//   onUnitPriceChange（文字を入れたときに、品目の id と入れた文字を渡す。省略すると入力欄は読み取りのみ）。
// 仕様 6（単価の入力欄）: 5 品目それぞれの行に、単価（円/台）の入力欄を 1 つ、品目の並びで出す。区画なしの行には出さない。
//   読み上げの名前は「<品目名>の単価（円/台）」。値は unitPriceTexts の文字（無ければ空）。文字を入れると onUnitPriceChange に渡す。
// 仕様 7（単価を入れた行）: 単価（0 以上の整数）を入れた品目の行は、「<台数> 台 × <単価> 円 = <金額> 円」と「未確定（出典なし）」を出す（「単価: 未確定」は出さない）。
//   台数は区画なしの什器も含める（工事原価に入れる台数。2 列目の台数は今までどおり区画ありの数）。空欄・読めない文字は「単価: 未確定」のまま。
// 仕様 8（注記）: 単価が空欄の品目の什器を置いているときだけ、「単価が未入力の什器は合計に入れていない（未確定）」を出す。
//   単価を入れた品目は台数 × 単価を合計に入れる（出典なしの仮置き）ことも、注記で明記する。
import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FIXTURE_ITEMS } from '../plan/fixtures'
import type { Fixture, FixtureItem } from '../plan/fixtures'
import { FixtureSummary, type FixtureSummaryProps } from './FixtureSummary'

function itemOf(label: string): FixtureItem {
  const found = FIXTURE_ITEMS.find((i) => i.label === label)
  if (!found) throw new Error(`品目「${label}」が無い`)
  return found.id
}

const kitchen = itemOf('キッチン')
const unitBath = itemOf('ユニットバス')
const toilet = itemOf('便器')
const storage = itemOf('収納')
const washbasin = itemOf('洗面')

const fx = (id: string, item: FixtureItem, unitId: string | null): Fixture => ({ id, item, unitId })

type El = ReactElement<{ children?: ReactNode } & Record<string, unknown>>

// 関数コンポーネントの返り値（要素の木）から、条件に合う要素を、出てくる順に集める
function findAll(node: ReactNode, match: (el: El) => boolean, out: El[] = []): El[] {
  if (Array.isArray(node)) {
    for (const n of node) findAll(n as ReactNode, match, out)
  } else if (isValidElement<El['props']>(node)) {
    if (match(node as El)) out.push(node as El)
    findAll(node.props.children, match, out)
  }
  return out
}

// 要素の木の文字（子の文字を順につなぐ）
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map((n) => textOf(n as ReactNode)).join('')
  if (isValidElement<El['props']>(node)) return textOf(node.props.children)
  return ''
}

const isTag = (tag: string) => (el: El) => el.type === tag
const render = (props: Partial<FixtureSummaryProps> = {}): ReactElement => FixtureSummary({ fixtures: [], ...props })
// 表の行を、セルの文字の並びで取る
const rowsOf = (tree: ReactNode): string[][] =>
  findAll(findAll(tree, isTag('tbody'))[0], isTag('tr')).map((tr) => findAll(tr, isTag('td')).map(textOf))

const UNPRICED = '単価: 未確定'
const HEADING = '什器（平面で置いたもの）'

describe('FixtureSummary（欄。仕様 1）', () => {
  it('見出し「什器（平面で置いたもの）」の欄（section）を出す', () => {
    const tree = render()
    expect(tree.type).toBe('section')
    expect(tree.props).toMatchObject({ 'aria-label': HEADING })
    expect(findAll(tree, isTag('h3')).map(textOf)).toEqual([HEADING])
  })
})

describe('FixtureSummary（種類ごと。仕様 2）', () => {
  it('何も置いていなければ、5 品目とも 0 台で、どの行にも「単価: 未確定」が付く', () => {
    expect(rowsOf(render())).toEqual([
      ['キッチン', '0 台', UNPRICED],
      ['ユニットバス', '0 台', UNPRICED],
      ['洗面', '0 台', UNPRICED],
      ['便器', '0 台', UNPRICED],
      ['収納', '0 台', UNPRICED],
    ])
  })

  it('置いた什器を、品目ごとに数える（台）', () => {
    const fixtures = [fx('fixture-1', kitchen, 'L0'), fx('fixture-2', kitchen, 'L1'), fx('fixture-3', toilet, 'L0'), fx('fixture-4', washbasin, 'L1')]
    expect(rowsOf(render({ fixtures, unitIds: ['L0', 'L1'] }))).toEqual([
      ['キッチン', '2 台', UNPRICED],
      ['ユニットバス', '0 台', UNPRICED],
      ['洗面', '1 台', UNPRICED],
      ['便器', '1 台', UNPRICED],
      ['収納', '0 台', UNPRICED],
    ])
  })
})

describe('FixtureSummary（区画なし。仕様 3）', () => {
  it('区画なしが無ければ、「区画なし」の行は出さない（5 行だけ）', () => {
    expect(rowsOf(render({ fixtures: [fx('fixture-1', kitchen, 'L0')], unitIds: ['L0'] }))).toHaveLength(5)
  })

  it('区画の指定が無い什器と、unitIds に無い区画の什器は、落とさず最後の「区画なし」の行に数える', () => {
    const fixtures = [fx('fixture-1', kitchen, 'L0'), fx('fixture-2', kitchen, 'L1'), fx('fixture-3', storage, null)]
    const rows = rowsOf(render({ fixtures, unitIds: ['L0'] }))
    expect(rows).toHaveLength(6)
    expect(rows[0]).toEqual(['キッチン', '1 台', UNPRICED])
    expect(rows[4]).toEqual(['収納', '0 台', UNPRICED])
    expect(rows[5]?.slice(0, 2)).toEqual(['区画なし', '2 台'])
  })

  it('unitIds を渡さなければ、区画の指定が無い什器だけを区画なしに数える', () => {
    const fixtures = [fx('fixture-1', kitchen, 'L9'), fx('fixture-2', storage, null)]
    const rows = rowsOf(render({ fixtures }))
    expect(rows[0]).toEqual(['キッチン', '1 台', UNPRICED])
    expect(rows[4]).toEqual(['収納', '0 台', UNPRICED])
    expect(rows[5]?.slice(0, 2)).toEqual(['区画なし', '1 台'])
  })

  it('区画が 1 つも無ければ、置いた什器はすべて区画なしに数える', () => {
    const rows = rowsOf(render({ fixtures: [fx('fixture-1', kitchen, 'L0'), fx('fixture-2', toilet, 'L1')], unitIds: [] }))
    expect(rows.slice(0, 5).map((r) => r[1])).toEqual(['0 台', '0 台', '0 台', '0 台', '0 台'])
    expect(rows[5]?.slice(0, 2)).toEqual(['区画なし', '2 台'])
  })
})

describe('FixtureSummary（工事原価に入れない注記。仕様 4）', () => {
  it('什器は、単価が決まるまで、工事原価（概算）の合計には入れない、と明記する', () => {
    const text = textOf(render())
    expect(text).toContain('工事原価（概算）の合計には入れない')
    expect(text).toContain('単価が決まるまで')
  })

  it('什器を置いていても、注記は出る', () => {
    const text = textOf(render({ fixtures: [fx('fixture-1', kitchen, 'L0')], unitIds: ['L0'] }))
    expect(text).toContain('工事原価（概算）の合計には入れない')
  })
})

describe('FixtureSummary（描ける。仕様 5）', () => {
  it('サーバー側の描画で例外が出ず、見出し・品目・件数・「単価: 未確定」が出る', () => {
    const html = renderToStaticMarkup(createElement(FixtureSummary, { fixtures: [fx('fixture-1', kitchen, 'L0')], unitIds: ['L0'] }))
    expect(html).toContain(HEADING)
    for (const name of ['キッチン', 'ユニットバス', '洗面', '便器', '収納']) expect(html, name).toContain(name)
    expect(html).toContain('1 台')
    expect(html.match(/単価: 未確定/g)).toHaveLength(5)
  })
})

type Texts = NonNullable<FixtureSummaryProps['unitPriceTexts']>
const texts = (...entries: Array<[FixtureItem, string]>): Texts => {
  const out: Texts = {}
  for (const [item, text] of entries) out[item] = text
  return out
}
const inputsOf = (tree: ReactNode) => findAll(tree, isTag('input'))
const MARK = '未確定（出典なし）'
const UNPRICED_NOTE = '単価が未入力の什器は合計に入れていない（未確定）'

describe('FixtureSummary（単価の入力欄。仕様 6）', () => {
  it('5 品目それぞれに入力欄が 1 つ、品目の並びで出る（読み上げの名前は「<品目名>の単価（円/台）」）', () => {
    const inputs = inputsOf(render())
    expect(inputs.map((i) => i.props['aria-label'])).toEqual([
      'キッチンの単価（円/台）',
      'ユニットバスの単価（円/台）',
      '洗面の単価（円/台）',
      '便器の単価（円/台）',
      '収納の単価（円/台）',
    ])
  })

  it('入力欄は品目の行（表の本体の行）の中にあり、1 行に 1 つ', () => {
    const rows = findAll(findAll(render(), isTag('tbody'))[0], isTag('tr'))
    expect(rows.map((tr) => inputsOf(tr).length)).toEqual([1, 1, 1, 1, 1])
  })

  it('区画なしの行には入力欄を出さない', () => {
    const tree = render({ fixtures: [fx('fixture-1', kitchen, null)] })
    const rows = findAll(findAll(tree, isTag('tbody'))[0], isTag('tr'))
    expect(rows).toHaveLength(6)
    expect(inputsOf(rows[5])).toHaveLength(0)
    expect(inputsOf(tree)).toHaveLength(5)
  })

  it('入力欄の値は unitPriceTexts の文字で、入力が無い品目は空', () => {
    const inputs = inputsOf(render({ unitPriceTexts: texts([kitchen, '450000'], [storage, '0']) }))
    expect(inputs.map((i) => i.props.value)).toEqual(['450000', '', '', '', '0'])
  })

  it('unitPriceTexts を渡さなければ、どの入力欄も空', () => {
    expect(inputsOf(render()).map((i) => i.props.value)).toEqual(['', '', '', '', ''])
  })

  it('文字を入れると、onUnitPriceChange に（品目の id, 入れた文字）が 1 回渡る', () => {
    const calls: Array<[FixtureItem, string]> = []
    const inputs = inputsOf(render({ onUnitPriceChange: (item, text) => calls.push([item, text]) }))
    // 4 番目の入力欄は便器の行（品目の並び: キッチン・ユニットバス・洗面・便器・収納）
    ;(inputs[3]?.props.onChange as (e: { target: { value: string } }) => void)({ target: { value: '30,000' } })
    expect(calls).toEqual([[toilet, '30,000']])
  })

  it('onUnitPriceChange を渡さなければ、入力欄は読み取りのみ（渡せば、書き換えられる）', () => {
    const readOnly = inputsOf(render())
    const editable = inputsOf(render({ onUnitPriceChange: () => undefined }))
    expect(readOnly).toHaveLength(5)
    expect(editable).toHaveLength(5)
    for (const i of readOnly) expect(i.props.readOnly).toBe(true)
    for (const i of editable) expect(Boolean(i.props.readOnly)).toBe(false)
  })
})

describe('FixtureSummary（単価を入れた行。仕様 7）', () => {
  it('単価を入れた品目の行は、「<台数> 台 × <単価> 円 = <金額> 円」と「未確定（出典なし）」を出す（ほかの行は今までどおり）', () => {
    const fixtures = [fx('fixture-1', kitchen, 'L0'), fx('fixture-2', kitchen, 'L1')]
    expect(rowsOf(render({ fixtures, unitIds: ['L0', 'L1'], unitPriceTexts: texts([kitchen, '450000']) }))).toEqual([
      ['キッチン', '2 台', `2 台 × 450,000 円 = 900,000 円 ${MARK}`],
      ['ユニットバス', '0 台', UNPRICED],
      ['洗面', '0 台', UNPRICED],
      ['便器', '0 台', UNPRICED],
      ['収納', '0 台', UNPRICED],
    ])
  })

  it('単価を入れた品目の行には、「単価: 未確定」は出ない', () => {
    const rows = rowsOf(render({ fixtures: [fx('fixture-1', toilet, 'L0')], unitIds: ['L0'], unitPriceTexts: texts([toilet, '30000']) }))
    expect(rows[3]?.[2]).not.toContain(UNPRICED)
  })

  it('金額に入れる台数は、区画なしの什器も含む（2 列目の台数は、区画ありの数のまま）', () => {
    const fixtures = [fx('fixture-1', kitchen, 'L0'), fx('fixture-2', kitchen, null), fx('fixture-3', kitchen, 'L9')]
    const rows = rowsOf(render({ fixtures, unitIds: ['L0'], unitPriceTexts: texts([kitchen, '450000']) }))
    expect(rows[0]).toEqual(['キッチン', '1 台', `3 台 × 450,000 円 = 1,350,000 円 ${MARK}`])
    expect(rows[5]?.slice(0, 2)).toEqual(['区画なし', '2 台'])
  })

  it('桁区切りのカンマ・全角の数字で入れた単価も読み、金額は 3 桁ごとにカンマを入れる', () => {
    const fixtures = [fx('fixture-1', washbasin, 'L0'), fx('fixture-2', washbasin, 'L0'), fx('fixture-3', washbasin, 'L0')]
    const rows = rowsOf(render({ fixtures, unitIds: ['L0'], unitPriceTexts: texts([washbasin, '１，２３４']) }))
    expect(rows[2]?.[2]).toBe(`3 台 × 1,234 円 = 3,702 円 ${MARK}`)
  })

  it('0 円の単価は入れた単価として、金額 0 円と「未確定（出典なし）」を出す', () => {
    const fixtures = [fx('fixture-1', storage, 'L0'), fx('fixture-2', storage, 'L0')]
    const rows = rowsOf(render({ fixtures, unitIds: ['L0'], unitPriceTexts: texts([storage, '0']) }))
    expect(rows[4]?.[2]).toBe(`2 台 × 0 円 = 0 円 ${MARK}`)
  })

  it('置いていない品目に単価を入れても、金額は 0 円', () => {
    const rows = rowsOf(render({ unitPriceTexts: texts([unitBath, '800000']) }))
    expect(rows[1]).toEqual(['ユニットバス', '0 台', `0 台 × 800,000 円 = 0 円 ${MARK}`])
  })

  it('空欄・空白だけ・数として読めない文字（小数・負・単位つき）は、「単価: 未確定」のまま', () => {
    const fixtures = [fx('fixture-1', kitchen, 'L0'), fx('fixture-2', toilet, 'L0'), fx('fixture-3', storage, 'L0'), fx('fixture-4', washbasin, 'L0')]
    const unitPriceTexts = texts([kitchen, ''], [toilet, 'abc'], [storage, '-5'], [washbasin, '1.5'], [unitBath, '  '])
    const rows = rowsOf(render({ fixtures, unitIds: ['L0'], unitPriceTexts }))
    expect(rows.map((r) => r[2])).toEqual([UNPRICED, UNPRICED, UNPRICED, UNPRICED, UNPRICED])
    expect(textOf(render({ fixtures, unitIds: ['L0'], unitPriceTexts }))).not.toContain(MARK)
    // 入れた文字は入力欄に残る（読めないだけで、消さない）。品目の並び: キッチン・ユニットバス・洗面・便器・収納
    expect(inputsOf(render({ fixtures, unitIds: ['L0'], unitPriceTexts })).map((i) => i.props.value)).toEqual(['', '  ', '1.5', 'abc', '-5'])
  })

  it('サーバー側の描画で、入れた単価が入力欄の値に出て、行に金額と印が出る', () => {
    const html = renderToStaticMarkup(
      createElement(FixtureSummary, { fixtures: [fx('fixture-1', kitchen, 'L0')], unitIds: ['L0'], unitPriceTexts: texts([kitchen, '450000']) }),
    )
    expect(html).toContain('value="450000"')
    expect(html).toContain('1 台 × 450,000 円 = 450,000 円')
    expect(html).toContain(MARK)
    expect(html.match(/単価: 未確定/g)).toHaveLength(4)
  })
})

describe('FixtureSummary（単価が空欄の什器の注記。仕様 8）', () => {
  it('単価が空欄の品目の什器を置いていれば、注記「単価が未入力の什器は合計に入れていない（未確定）」を出す', () => {
    const text = textOf(render({ fixtures: [fx('fixture-1', kitchen, 'L0'), fx('fixture-2', toilet, 'L0')], unitIds: ['L0'], unitPriceTexts: texts([kitchen, '450000']) }))
    expect(text).toContain(UNPRICED_NOTE)
  })

  it('区画なしの什器でも、単価が空欄なら注記を出す', () => {
    expect(textOf(render({ fixtures: [fx('fixture-1', storage, null)] }))).toContain(UNPRICED_NOTE)
  })

  it('什器を置いていなければ、単価が空欄でも出さない', () => {
    expect(textOf(render())).not.toContain(UNPRICED_NOTE)
    expect(textOf(render({ unitPriceTexts: texts([kitchen, '450000']) }))).not.toContain(UNPRICED_NOTE)
  })

  it('置いた什器の品目がすべて単価ありなら、出さない', () => {
    const fixtures = [fx('fixture-1', kitchen, 'L0'), fx('fixture-2', toilet, null)]
    const text = textOf(render({ fixtures, unitIds: ['L0'], unitPriceTexts: texts([kitchen, '450000'], [toilet, '0']) }))
    expect(text).not.toContain(UNPRICED_NOTE)
  })

  it('単価を入れた品目は 台数 × 単価 を合計に入れる（出典なしの仮置き）、と注記で明記する（什器の有無によらない）', () => {
    for (const fixtures of [[], [fx('fixture-1', kitchen, 'L0')]]) {
      const text = textOf(render({ fixtures, unitIds: ['L0'] }))
      expect(text).toContain('単価（円/台）を入れた品目は、台数 × 単価を合計に入れる')
      expect(text).toContain('出典なしの仮置き')
    }
  })
})
