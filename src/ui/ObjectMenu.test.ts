// 仕様: 左メニューの部品（ハブ A-03 G55、D-04 共通部品「左メニュー」）。P2 の 2D 平面・P3・P4 で共通に使う。見た目と挙動は P3 の左の帯のまま。文言は仮置き。
// 代表の決定（G55）: 「図面のとき左メニューは必須。オブジェクトが何で、どんな内容が入っているかを可視化する。」
// props: sources（種類ごとの結果）、selectedKind（選んでいる種類。無ければ null）、onSelect（次の選びを受ける）。
//   ほかに、説明文 caption と注記 notice（どちらも省略できる）。
// 仕様 1（一覧）: 見出し「オブジェクト」の下に、種類ごとに 1 行、左メニューの並び（countObjects）で、名前と件数を出す。
//   注記は、どの行にも付かない。
//   P3 で置いた什器（ハブ A-03 G69）の行「什器」が、廊下の後・住戸の前に出る（仮置き）。全部で 12 行。
// 仕様 2（説明文）: 見出しの下に説明文を出す。既定は「種類ごとの件数」。caption を渡すとそれに替わる
//   （P3 は「種類ごとの件数（P3 の自動作成の結果）」を渡して、今までと同じ文にする）。
// 仕様 3（注記）: notice を渡したときだけ、その文を出す（P4 の自動作成の前の「自動作成の後に出ます」）。
// 仕様 4（選び方）: 行を押すと、onSelect に次の選びを渡す。何も選んでいなければ押した種類、別の種類を押せばその種類、
//   選んでいる種類をもう一度押せば null（toggleKind）。選んでいる行だけ aria-pressed が true。
// 仕様 5（中身）: 種類を選んでいるとき、一覧の下に「<名前>の中身」の欄を出し、detailOfKind の見出しと行を並べる。
//   件数が 0 のときは「なし」だけ。選んでいなければ欄は無い。壁と開口の数は、住戸の中身の 1 行に「未配線」と出す（detailOfKind のまま。仮置き）。
// 仕様 6（描ける）: React で描ける（サーバー側の描画で例外が出ない）。帯の幅は OBJECT_MENU_WIDTH（呼び出し側の列の幅に使う）。
import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Rect } from '../plan/candidateCells'
import { FIXTURE_ITEMS, type Fixture, type FixtureItem } from '../plan/fixtures'
import type { ObjectDetailSources } from '../plan/objectDetail'
import type { ObjectKind } from '../plan/objectMenu'
import { roomsOfCells } from '../plan/rooms'
import { OBJECT_MENU_WIDTH, ObjectMenu, objectMenuWidthOf, type ObjectMenuProps } from './ObjectMenu'

// 左メニューの並び（12 種類。什器は廊下の後、住戸の前）
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

// 品目は名前で引く（品目の ID は仮置きなので、試験に書かない）
function itemOf(label: string): FixtureItem {
  const found = FIXTURE_ITEMS.find((i) => i.label === label)
  if (!found) throw new Error(`品目「${label}」が無い`)
  return found.id
}

// 種類ごとに件数が違う入力（取り違えを見つけるため）。住戸 2（各 4 室で部屋 8）、縦シャフトは 0、什器 4（区画なしを含む）
const UNITS: Rect[] = [
  { id: 'L0', x0: 0, y0: 0, x1: 6000, y1: 6000 },
  { id: 'L1', x0: 0, y0: 6000, x1: 6000, y1: 12000 },
]
const FIXTURES: Fixture[] = [
  { id: 'fixture-1', item: itemOf('キッチン'), unitId: 'L0' },
  { id: 'fixture-2', item: itemOf('便器'), unitId: 'L1' },
  { id: 'fixture-3', item: itemOf('収納'), unitId: null },
  { id: 'fixture-4', item: itemOf('キッチン'), unitId: 'ZZ' },
]
const SOURCES: ObjectDetailSources = {
  siteBoundaries: [{}],
  outlines: [{}],
  gridLines: [0, 6000, 12000],
  cores: [{ id: 'stairA', x0: 0, y0: 0, x1: 1600, y1: 3000 }],
  shafts: [],
  corridors: [{ id: 'corridor', x0: 6000, y0: 0, x1: 7600, y1: 12000 }],
  fixtures: FIXTURES,
  units: UNITS,
  rooms: roomsOfCells(UNITS),
}
// 行の文字（名前 + 件数 + 注記）
const ROW_TEXTS = [
  '筆界1',
  '外形1',
  '通り芯3',
  '柱0',
  'コア1',
  '縦シャフト0',
  '廊下1',
  '什器4',
  '住戸2',
  '壁0',
  '開口0',
  '部屋8',
]

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

// 要素の木の文字（子の文字を順につなぐ）。
// 開け閉めの印（▸・▾）は aria-hidden の飾りなので数えない（代表の指示「枠なし・トグルでリスト化」2026-11-07。行の名前と件数は従来どおり確かめる）
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map((n) => textOf(n as ReactNode)).join('')
  if (isValidElement<El['props']>(node) && (node.props as { 'aria-hidden'?: unknown })['aria-hidden'] === 'true') return ''
  if (isValidElement<El['props']>(node)) return textOf(node.props.children)
  return ''
}

const isTag = (tag: string) => (el: El) => el.type === tag
const render = (props: Partial<ObjectMenuProps> = {}): ReactElement =>
  ObjectMenu({ sources: SOURCES, selectedKind: null, onSelect: () => undefined, ...props })
const buttonsOf = (tree: ReactNode) => findAll(tree, isTag('button'))
const sectionOf = (tree: ReactNode) => findAll(tree, isTag('section'))

describe('ObjectMenu（一覧。仕様 1）', () => {
  it('見出し「オブジェクト」を出す', () => {
    const h2 = findAll(render(), isTag('h2'))
    expect(h2.map(textOf)).toEqual(['オブジェクト'])
  })

  it('種類ごとに 1 行（12 行）で、名前・件数・注記が左メニューの並びどおり', () => {
    const rows = findAll(render(), isTag('li'))
    expect(rows.map(textOf)).toEqual(ROW_TEXTS)
  })

  it('各行は押せるボタンで、12 個ある', () => {
    expect(buttonsOf(render())).toHaveLength(12)
  })

  it('什器の行は、廊下の次・住戸の前に、名前「什器」と置いた数（区画なしを含む）で出る。注記は付かない', () => {
    const rows = findAll(render(), isTag('li')).map(textOf)
    expect(rows.slice(rows.indexOf('廊下1'), rows.indexOf('住戸2') + 1)).toEqual(['廊下1', '什器4', '住戸2'])
  })

  it('注記は、どの行にも付かない', () => {
    const noted = findAll(render(), isTag('li')).filter((li) => textOf(li).includes('意味づけ未配線'))
    expect(noted.map(textOf)).toEqual([])
  })

  it('結果が空なら、どの行も件数 0', () => {
    const rows = findAll(render({ sources: {} }), isTag('li')).map(textOf)
    expect(rows).toEqual([
      '筆界0',
      '外形0',
      '通り芯0',
      '柱0',
      'コア0',
      '縦シャフト0',
      '廊下0',
      '什器0',
      '住戸0',
      '壁0',
      '開口0',
      '部屋0',
    ])
  })
})

describe('ObjectMenu（説明文と注記。仕様 2・3）', () => {
  it('説明文は、既定では「種類ごとの件数」', () => {
    const p = findAll(render(), isTag('p'))
    expect(p.map(textOf)).toEqual(['種類ごとの件数'])
  })

  it('caption を渡すと、説明文がそれに替わる（P3 の今までの文）', () => {
    const caption = '種類ごとの件数（P3 の自動作成の結果）'
    expect(findAll(render({ caption }), isTag('p')).map(textOf)).toEqual([caption])
  })

  it('notice を渡したときだけ、その文を出す', () => {
    const notice = '自動作成の後に出ます'
    expect(textOf(render({ notice }))).toContain(notice)
    expect(textOf(render())).not.toContain(notice)
  })

  it('notice を渡しても、説明文と一覧はそのまま出る', () => {
    const tree = render({ notice: '自動作成の後に出ます' })
    expect(findAll(tree, isTag('p')).map(textOf)).toEqual(['種類ごとの件数', '自動作成の後に出ます'])
    expect(findAll(tree, isTag('li')).map(textOf)).toEqual(ROW_TEXTS)
  })
})

describe('ObjectMenu（選び方。仕様 4）', () => {
  it('何も選んでいないとき、どの行を押しても、押した種類が onSelect に渡る', () => {
    KINDS.forEach((kind, i) => {
      const onSelect = vi.fn()
      const button = buttonsOf(render({ selectedKind: null, onSelect }))[i]
      ;(button?.props.onClick as () => void)()
      expect(onSelect, kind).toHaveBeenCalledTimes(1)
      expect(onSelect, kind).toHaveBeenCalledWith(kind)
    })
  })

  it('別の種類を押すと、その種類が渡る', () => {
    const onSelect = vi.fn()
    const roomButton = buttonsOf(render({ selectedKind: 'unit', onSelect }))[KINDS.indexOf('room')]
    ;(roomButton?.props.onClick as () => void)()
    expect(onSelect).toHaveBeenCalledWith('room')
  })

  it('選んでいる種類をもう一度押すと、null（選びを外す）が渡る', () => {
    const onSelect = vi.fn()
    const unitButton = buttonsOf(render({ selectedKind: 'unit', onSelect }))[KINDS.indexOf('unit')]
    ;(unitButton?.props.onClick as () => void)()
    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('選んでいる行だけ aria-pressed が true（何も選んでいなければ全部 false）', () => {
    const pressed = (selectedKind: ObjectKind | null) => buttonsOf(render({ selectedKind })).map((b) => b.props['aria-pressed'])
    expect(pressed(null)).toEqual(new Array(12).fill(false))
    expect(pressed('unit')).toEqual(KINDS.map((k) => k === 'unit'))
    expect(pressed('siteBoundary')).toEqual(KINDS.map((k) => k === 'siteBoundary'))
    expect(pressed('fixture')).toEqual(KINDS.map((k) => k === 'fixture'))
  })

  it('ボタンは type="button"（フォームの送信にしない）', () => {
    for (const b of buttonsOf(render())) expect(b.props.type).toBe('button')
  })
})

describe('ObjectMenu（選んだ種類の中身。仕様 5）', () => {
  it('何も選んでいなければ、中身の欄は無い', () => {
    expect(sectionOf(render())).toHaveLength(0)
  })

  it('住戸を選ぶと「住戸の中身」の欄が 1 つ出て、見出しが付く', () => {
    const sections = sectionOf(render({ selectedKind: 'unit' }))
    expect(sections).toHaveLength(1)
    expect(sections[0]?.props['aria-label']).toBe('住戸の中身')
    expect(findAll(sections[0], isTag('h3')).map(textOf)).toEqual(['住戸の中身'])
  })

  it('住戸の中身は、区画ごとに見出しと 5 行（面積・部屋の数・壁と開口の数・意味づけの結果・レイヤー）を、入力の並びのまま出す', () => {
    const section = sectionOf(render({ selectedKind: 'unit' }))[0]
    expect(findAll(section, isTag('strong')).map(textOf)).toEqual(['住戸 L0', '住戸 L1'])
    expect(findAll(section, isTag('div')).map(textOf)).toEqual([
      '面積: 36.0 m²',
      '部屋の数: 4',
      '壁と開口の数: 未配線',
      '意味づけの結果: 未配線',
      'レイヤー: 住戸',
      '面積: 36.0 m²',
      '部屋の数: 4',
      '壁と開口の数: 未配線',
      '意味づけの結果: 未配線',
      'レイヤー: 住戸',
    ])
  })

  it('通り芯の中身は、位置（mm）を 1 本ずつ出す', () => {
    const section = sectionOf(render({ selectedKind: 'grid' }))[0]
    expect(findAll(section, isTag('strong')).map(textOf)).toEqual(['通り芯 1', '通り芯 2', '通り芯 3'])
    expect(findAll(section, isTag('div')).map(textOf).filter((l) => l.startsWith('位置'))).toEqual([
      '位置: 0 mm',
      '位置: 6000 mm',
      '位置: 12000 mm',
    ])
  })

  it('什器を選ぶと「什器の中身」の欄が出て、什器ごとに見出しと 4 行（品目・区画・意味づけの結果・レイヤー）を、置いた順に出す', () => {
    const sections = sectionOf(render({ selectedKind: 'fixture' }))
    expect(sections).toHaveLength(1)
    const section = sections[0]
    expect(section?.props['aria-label']).toBe('什器の中身')
    expect(findAll(section, isTag('h3')).map(textOf)).toEqual(['什器の中身'])
    expect(findAll(section, isTag('strong')).map(textOf)).toEqual(['什器 fixture-1', '什器 fixture-2', '什器 fixture-3', '什器 fixture-4'])
    expect(findAll(section, isTag('div')).map(textOf)).toEqual([
      '品目: キッチン',
      '区画: L0',
      '意味づけの結果: 未配線',
      'レイヤー: その他',
      '品目: 便器',
      '区画: L1',
      '意味づけの結果: 未配線',
      'レイヤー: その他',
      '品目: 収納',
      '区画: 区画なし',
      '意味づけの結果: 未配線',
      'レイヤー: その他',
      '品目: キッチン',
      '区画: 区画なし',
      '意味づけの結果: 未配線',
      'レイヤー: その他',
    ])
  })

  it('什器が 0 件のとき什器を選ぶと、「什器の中身」は「なし」だけを出す', () => {
    const section = sectionOf(render({ sources: { ...SOURCES, fixtures: [] }, selectedKind: 'fixture' }))[0]
    expect(section?.props['aria-label']).toBe('什器の中身')
    expect(findAll(section, isTag('p')).map(textOf)).toEqual(['なし'])
    expect(findAll(section, isTag('li'))).toHaveLength(0)
  })

  it('件数が 0 の種類（縦シャフト）を選ぶと、「なし」だけを出す', () => {
    const section = sectionOf(render({ selectedKind: 'shaft' }))[0]
    expect(section?.props['aria-label']).toBe('縦シャフトの中身')
    expect(findAll(section, isTag('p')).map(textOf)).toEqual(['なし'])
    expect(findAll(section, isTag('li'))).toHaveLength(0)
  })

  it('データが無い種類（柱・壁・開口）を選んでも、「なし」を出す（壁と開口の数の行は、住戸の中身にだけ出る）', () => {
    for (const kind of ['column', 'wall', 'opening'] as const) {
      const section = sectionOf(render({ selectedKind: kind }))[0]
      expect(findAll(section, isTag('p')).map(textOf), kind).toEqual(['なし'])
      expect(textOf(section), kind).not.toMatch(/壁の数|開口の数/)
    }
  })

  // 代表の指示「トグルでリスト化」（2026-11-07）: 中身の欄は、一覧の後ではなく、選んだ行のすぐ下に開く。一覧の 12 行の名前と件数はそのまま
  it('中身の欄は選んだ行（住戸）の中に開く。一覧の 12 行の名前と件数はそのまま', () => {
    const tree = render({ selectedKind: 'unit' })
    const rowList = findAll(tree, isTag('ul'))[0]!
    const rows = Children.toArray((rowList.props as { children?: ReactNode }).children).filter(isValidElement) as ReactElement[]
    const buttonText = (li: ReactElement) => textOf(findAll(li, isTag('button'))[0] ?? null)
    expect(rows.map(buttonText)).toEqual(ROW_TEXTS)
    const opened = rows.filter((li) => findAll(li, isTag('section')).length > 0)
    expect(opened.map(buttonText)).toEqual([ROW_TEXTS.find((t) => t.startsWith('住戸'))])
  })
})

describe('ObjectMenu（描ける。仕様 6）', () => {
  it('サーバー側の描画で例外が出ず、見出しと全種類の名前が出る', () => {
    const html = renderToStaticMarkup(createElement(ObjectMenu, { sources: SOURCES, selectedKind: 'unit', onSelect: () => undefined }))
    expect(html).toContain('オブジェクト')
    for (const name of ['筆界', '外形', '通り芯', '柱', 'コア', '縦シャフト', '廊下', '什器', '住戸', '壁', '開口', '部屋']) {
      expect(html, name).toContain(name)
    }
    expect(html).toContain('住戸の中身')
  })

  it('選んでいる行は aria-pressed="true" で描かれる', () => {
    const html = renderToStaticMarkup(createElement(ObjectMenu, { sources: SOURCES, selectedKind: 'room', onSelect: () => undefined }))
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(11)
  })

  it('帯の幅は OBJECT_MENU_WIDTH（枠線と余白を含めた幅）で、帯は aside', () => {
    const tree = render()
    expect(tree.type).toBe('aside')
    const style = (tree.props as { style: { width: number; boxSizing: string } }).style
    expect(style.width).toBe(OBJECT_MENU_WIDTH)
    expect(style.boxSizing).toBe('border-box')
    expect(OBJECT_MENU_WIDTH).toBe(180)
  })
})

// 仕様 7（共用部のグループ。ハブ A-03 G75）: 一覧の下に、共用部のグループを出す。基準階は、自動作成の結果から数えた数を付ける（廊下・階段 A／B・EV ホール・EPS・DS）。
// 1F は名前だけを出す（配置は未配線なので件数は出さない）。
describe('ObjectMenu（共用部のグループ。仕様 7）', () => {
  it('基準階は名前と数（SOURCES の結果から）を、1F は名前だけを、一覧の下に 1 行ずつ出す', () => {
    const lines = findAll(render(), isTag('div')).map(textOf)
    expect(lines).toContain('基準階：廊下 1、階段 A 1、階段 B 0、EV ホール 0、EPS 0、DS 0')
    expect(lines).toContain('1F：エントランス 0、風除室 0、ロビー 0、管理室 0、メールコーナー 0、ゴミ置場 0')
  })

  it('1F の行は、区画に付けた名前の数を出す（渡されたときだけ。種類の行の数は 12 のまま）', () => {
    expect(buttonsOf(render())).toHaveLength(12)
    const lines = findAll(render({ firstFloorCounts: [{ name: 'エントランス', count: 2 }] }), isTag('div')).map(textOf)
    expect(lines).toContain('1F：エントランス 2、風除室 0、ロビー 0、管理室 0、メールコーナー 0、ゴミ置場 0')
  })
})

// 仕様 8（折りたたみ。G55）: 開閉のボタンを渡したときだけ、開閉のボタンを出す。折りたたむと、ボタンだけを出し、一覧・説明・中身・共用部を出さない。
// 折りたたんだ帯は、開いているときより細い（objectMenuWidthOf）。状態は呼び出し側が持つ（folded と onToggleFold を渡す）。
describe('ObjectMenu（折りたたみ。仕様 8）', () => {
  const noop = () => undefined

  it('開閉のボタンは、onToggleFold を渡したときだけ出る（渡さなければ、ボタンは行の 12 個だけ）', () => {
    expect(buttonsOf(render())).toHaveLength(12)
    expect(buttonsOf(render({ onToggleFold: noop }))).toHaveLength(13)
  })

  it('開閉のボタンは、開いているとき aria-expanded="true"、折りたたむと "false"', () => {
    const open = buttonsOf(render({ folded: false, onToggleFold: noop }))[0]
    const closed = buttonsOf(render({ folded: true, onToggleFold: noop }))[0]
    expect(open?.props['aria-expanded']).toBe(true)
    expect(closed?.props['aria-expanded']).toBe(false)
  })

  it('開閉のボタンを押すと、onToggleFold が 1 回呼ばれる', () => {
    const onToggleFold = vi.fn()
    const toggle = buttonsOf(render({ folded: true, onToggleFold }))[0]
    ;(toggle?.props.onClick as () => void)()
    expect(onToggleFold).toHaveBeenCalledTimes(1)
  })

  it('折りたたむと、ボタンだけを出す（一覧・説明・注記・中身・共用部は出さない）', () => {
    const tree = render({ folded: true, onToggleFold: noop, selectedKind: 'unit', notice: '自動作成の後に出ます' })
    expect(buttonsOf(tree)).toHaveLength(1)
    expect(findAll(tree, isTag('li'))).toHaveLength(0)
    expect(findAll(tree, isTag('p'))).toHaveLength(0)
    expect(sectionOf(tree)).toHaveLength(0)
    expect(textOf(tree)).not.toContain('共用部（グループ）')
  })

  it('折りたたんだ帯は、開いているときより細い（objectMenuWidthOf。開いているときは OBJECT_MENU_WIDTH）', () => {
    const widthOf = (folded: boolean) => (findAll(render({ folded, onToggleFold: noop }), isTag('aside'))[0]?.props.style as { width: number }).width
    expect(widthOf(true)).toBe(objectMenuWidthOf(true))
    expect(widthOf(false)).toBe(objectMenuWidthOf(false))
    expect(objectMenuWidthOf(true)).toBeLessThan(objectMenuWidthOf(false))
    expect(objectMenuWidthOf(false)).toBe(OBJECT_MENU_WIDTH)
  })
})
