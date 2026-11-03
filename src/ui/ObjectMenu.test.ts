// 仕様: 左メニューの部品（ハブ A-03 G55、D-04 共通部品「左メニュー」）。P2 の 2D 平面・P3・P4 で共通に使う。見た目と挙動は P3 の左の帯のまま。文言は仮置き。
// 代表の決定（G55）: 「図面のとき左メニューは必須。オブジェクトが何で、どんな内容が入っているかを可視化する。」
// props: sources（種類ごとの結果）、selectedKind（選んでいる種類。無ければ null）、onSelect（次の選びを受ける）。
//   ほかに、説明文 caption と注記 notice（どちらも省略できる）。
// 仕様 1（一覧）: 見出し「オブジェクト」の下に、種類ごとに 1 行、左メニューの並び（countObjects）で、名前と件数を出す。
//   柱・壁・開口の行には「（意味づけ未配線）」の注記が付き、ほかの行には付かない。
// 仕様 2（説明文）: 見出しの下に説明文を出す。既定は「種類ごとの件数」。caption を渡すとそれに替わる
//   （P3 は「種類ごとの件数（P3 の自動作成の結果）」を渡して、今までと同じ文にする）。
// 仕様 3（注記）: notice を渡したときだけ、その文を出す（P4 の自動作成の前の「自動作成の後に出ます」）。
// 仕様 4（選び方）: 行を押すと、onSelect に次の選びを渡す。何も選んでいなければ押した種類、別の種類を押せばその種類、
//   選んでいる種類をもう一度押せば null（toggleKind）。選んでいる行だけ aria-pressed が true。
// 仕様 5（中身）: 種類を選んでいるとき、一覧の下に「<名前>の中身」の欄を出し、detailOfKind の見出しと行を並べる。
//   件数が 0 のときは「なし」だけ。選んでいなければ欄は無い。壁と開口の数は、住戸の中身の 1 行に「未配線」と出す（detailOfKind のまま。仮置き）。
// 仕様 6（描ける）: React で描ける（サーバー側の描画で例外が出ない）。帯の幅は OBJECT_MENU_WIDTH（呼び出し側の列の幅に使う）。
import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Rect } from '../plan/candidateCells'
import type { ObjectDetailSources } from '../plan/objectDetail'
import type { ObjectKind } from '../plan/objectMenu'
import { roomsOfCells } from '../plan/rooms'
import { OBJECT_MENU_WIDTH, ObjectMenu, type ObjectMenuProps } from './ObjectMenu'

// 左メニューの並び（11 種類）
const KINDS: readonly ObjectKind[] = [
  'siteBoundary',
  'outline',
  'grid',
  'column',
  'core',
  'shaft',
  'corridor',
  'unit',
  'wall',
  'opening',
  'room',
]

// 種類ごとに件数が違う入力（取り違えを見つけるため）。住戸 2（各 4 室で部屋 8）、縦シャフトは 0
const UNITS: Rect[] = [
  { id: 'L0', x0: 0, y0: 0, x1: 6000, y1: 6000 },
  { id: 'L1', x0: 0, y0: 6000, x1: 6000, y1: 12000 },
]
const SOURCES: ObjectDetailSources = {
  siteBoundaries: [{}],
  outlines: [{}],
  gridLines: [0, 6000, 12000],
  cores: [{ id: 'stairA', x0: 0, y0: 0, x1: 1600, y1: 3000 }],
  shafts: [],
  corridors: [{ id: 'corridor', x0: 6000, y0: 0, x1: 7600, y1: 12000 }],
  units: UNITS,
  rooms: roomsOfCells(UNITS),
}
// 行の文字（名前 + 件数 + 注記）
const ROW_TEXTS = [
  '筆界1',
  '外形1',
  '通り芯3',
  '柱0（意味づけ未配線）',
  'コア1',
  '縦シャフト0',
  '廊下1',
  '住戸2',
  '壁0（意味づけ未配線）',
  '開口0（意味づけ未配線）',
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

// 要素の木の文字（子の文字を順につなぐ）
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map((n) => textOf(n as ReactNode)).join('')
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

  it('種類ごとに 1 行（11 行）で、名前・件数・注記が左メニューの並びどおり', () => {
    const rows = findAll(render(), isTag('li'))
    expect(rows.map(textOf)).toEqual(ROW_TEXTS)
  })

  it('各行は押せるボタンで、11 個ある', () => {
    expect(buttonsOf(render())).toHaveLength(11)
  })

  it('注記「（意味づけ未配線）」が付くのは柱・壁・開口の行だけ', () => {
    const noted = findAll(render(), isTag('li')).filter((li) => textOf(li).includes('意味づけ未配線'))
    expect(noted.map(textOf)).toEqual(['柱0（意味づけ未配線）', '壁0（意味づけ未配線）', '開口0（意味づけ未配線）'])
  })

  it('結果が空なら、どの行も件数 0', () => {
    const rows = findAll(render({ sources: {} }), isTag('li')).map(textOf)
    expect(rows).toEqual([
      '筆界0',
      '外形0',
      '通り芯0',
      '柱0（意味づけ未配線）',
      'コア0',
      '縦シャフト0',
      '廊下0',
      '住戸0',
      '壁0（意味づけ未配線）',
      '開口0（意味づけ未配線）',
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
    expect(pressed(null)).toEqual(new Array(11).fill(false))
    expect(pressed('unit')).toEqual(KINDS.map((k) => k === 'unit'))
    expect(pressed('siteBoundary')).toEqual(KINDS.map((k) => k === 'siteBoundary'))
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

  it('中身の欄は一覧の下に出る（先に一覧の ul、次に欄、欄の中に ul）。一覧の 11 行はそのまま', () => {
    const tree = render({ selectedKind: 'unit' })
    const order = findAll(tree, (el) => el.type === 'ul' || el.type === 'section').map((el) => el.type)
    expect(order).toEqual(['ul', 'section', 'ul'])
    const rowList = findAll(tree, isTag('ul'))[0]
    expect(findAll(rowList, isTag('li')).map(textOf)).toEqual(ROW_TEXTS)
  })
})

describe('ObjectMenu（描ける。仕様 6）', () => {
  it('サーバー側の描画で例外が出ず、見出しと全種類の名前が出る', () => {
    const html = renderToStaticMarkup(createElement(ObjectMenu, { sources: SOURCES, selectedKind: 'unit', onSelect: () => undefined }))
    expect(html).toContain('オブジェクト')
    for (const name of ['筆界', '外形', '通り芯', '柱', 'コア', '縦シャフト', '廊下', '住戸', '壁', '開口', '部屋']) {
      expect(html, name).toContain(name)
    }
    expect(html).toContain('住戸の中身')
  })

  it('選んでいる行は aria-pressed="true" で描かれる', () => {
    const html = renderToStaticMarkup(createElement(ObjectMenu, { sources: SOURCES, selectedKind: 'room', onSelect: () => undefined }))
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(10)
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
