import { useSite } from '../store/site'
import { useFloorPlans } from '../store/floorPlans'
import { useDrawing } from '../store/drawing'
import { generateAutoPlan } from '../plan/autoPlan'
// 仕様（ハブ A-03 G69、D-04 P2・P3）: 道具の「什器」を P3 の画面に配線する。P3 で使う。文言は仮置き。
// 仕様 1（道具が出る）: P3 の右パネルに、見出し「什器」と、5 品目のボタン（キッチン・ユニットバス・洗面・便器・収納の順）が出る。
//   選んだ品目・置いた什器の一覧・外す操作は店舗のもの。
// 仕様 2（選んでいないとき）: 品目を選んでいなければ、平面の区画を押せる四角は出ない。
// 仕様 3（選んでいるとき）: 品目を選んでいれば、平面の区画（住戸の区画候補）ごとに、押せる四角が 1 つずつ出る。
//   区画を押すと、店舗の「選んでいる品目を置く」が、その区画の id で呼ばれる。
// 仕様 4（置いた什器）: 置いた什器は、その区画の中央に品目名で出る。右パネルに、置いた什器の一覧（外すボタン付き）と、種類ごとの件数が出る。
//   区画が無くなった什器は、落とさず「区画なし」に数える（図には出さない）。
// 仕様 5（区画の id を知らせる）: P3 は、いまの区画（住戸の区画候補）の id を店舗に知らせる。P4 が「区画なし」を数えるのに使う。
// 仕様 6（左メニューの什器・G69）: P3 の左メニューの「什器」の行（廊下の次・壁の前。Codex の版で住戸の行は無くなった。代表の決定 2026-11-08）に、置いた什器の数が出る。区画なしの什器も数える。
//   左メニューの入力には、店舗の什器の一覧（右パネルの一覧と同じもの）を渡す。
// 仕様 7（平面の印を押すと外す・G69。仮置き）: 平面の層（FixtureLayer）へ、店舗の「外す」を渡す。品目を選んでいないとき、置いた什器の印は押せる
//   （層が、押した印の什器の id で呼ぶ）。品目を選んでいる間は、印は押せない（印の上を押しても区画に届き、続けて置ける）。
// 描画は実物（react-dom/server の静的描画）。差し替えるのは、店舗の読み出しだけ（zustand はサーバー側の描画で初期値を返すため）。
//   部品（FixturePalette・FixtureLayer）は実物のまま描き、受け取った props だけ控える。
//   useEffect はサーバー側の描画では動かないので、呼ばれた場所でその場で動かす（店舗への知らせを確かめるため）。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { candidateCells } from '../plan/candidateCells'
import { FIXTURE_ITEMS } from '../plan/fixtures'
import type { Fixture, FixtureItem } from '../plan/fixtures'
import type { FixtureLayerProps } from './FixtureLayer'
import type { FixturePaletteProps } from './FixturePalette'

// 店舗の中身（試験ごとに差し替える）と、部品が受け取った props
const fx = vi.hoisted(() => ({
  state: {
    fixtures: [] as unknown[],
    selectedItem: null as unknown,
    selectItem: vi.fn(),
    placeSelected: vi.fn(),
    remove: vi.fn(),
    setUnitIds: vi.fn(),
  },
  layer: null as unknown,
  palette: null as unknown,
}))
vi.mock('../store/fixtures', () => ({
  useFixtures: (selector: (s: typeof fx.state) => unknown) => selector(fx.state),
}))
vi.mock('./FixtureLayer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./FixtureLayer')>()
  return {
    ...actual,
    FixtureLayer: (props: FixtureLayerProps) => {
      fx.layer = props
      return actual.FixtureLayer(props)
    },
  }
})
vi.mock('./FixturePalette', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./FixturePalette')>()
  return {
    ...actual,
    FixturePalette: (props: FixturePaletteProps) => {
      fx.palette = props
      return actual.FixturePalette(props)
    },
  }
})
// 描画では店舗が初期の状態を返すので、今のモードだけここで渡す（左メニューの開閉の既定と、右パネルの項目に効く）
// 什器の欄は作図（Drawing）モードのときだけ出る（Codex の版。システムモードでは作図の道具を隠す、cdb24f8。代表の決定 2026-11-07 で今の版を正とする）
const modeShell = vi.hoisted(() => ({ mode: 'drawing' }))
vi.mock('../store/mode', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../store/mode')>()
  const screenModes = await import('../app/screenModes')
  return { ...actual, useActiveMode: (screen: string) => actual.activeModeOf(screenModes.SCREEN_MODES, modeShell.mode, screen) }
})
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useEffect: (effect: () => void) => {
      effect()
    },
  }
})

vi.mock('../store/site', async (importOriginal) => {
 const actual = await importOriginal<typeof import('../store/site')>()
 return {...actual, useSite: Object.assign((selector: (s: ReturnType<typeof actual.useSite.getState>) => unknown) => selector(actual.useSite.getState()), actual.useSite)}
})
vi.mock('../store/floorPlans', async (importOriginal) => {
 const actual = await importOriginal<typeof import('../store/floorPlans')>()
 return {...actual, useFloorPlans: Object.assign(() => actual.useFloorPlans.getState(), actual.useFloorPlans)}
})
// Codex の版を正とする（代表の決定 2026-11-08）: P3 の左の帯（FloorPlanMenu）に住戸構成の条件欄（VolumePlanPanel）が入った（03b0a0e）。
// その欄は useEffect の中で document を読み、状態を書き換える。この試験は useEffect を描画の途中でその場で動かすので、描画が止まらなくなる。
// 什器の配線の試験には関わらない欄なので、ここでは空の部品に差し替える（条件欄の試験は VolumePlanAdoption.test.tsx 等）
vi.mock('./VolumePlanPanel', () => ({ VolumePlanPanel: () => null }))
import { P3Plan } from './P3Plan'

function itemOf(label: string): FixtureItem {
  const found = FIXTURE_ITEMS.find((i) => i.label === label)
  if (!found) throw new Error(`品目「${label}」が無い`)
  return found.id
}

const kitchen = itemOf('キッチン')
const toilet = itemOf('便器')
// 押されている什器の道具のボタンの数。P3 の画面には直線・曲線の道具も出る（G152）ので、品目の名前のボタンだけを数える
const pressedFixtureButtons = (html: string): number =>
  [...html.matchAll(/<button[^>]*aria-pressed="true"[^>]*>([\s\S]*?)<\/button>/g)].filter((m) =>
    FIXTURE_ITEMS.some((i) => m[1]!.replace(/<[^>]*>/g, '').includes(i.label)),
  ).length

// P3 の画面の既定の入力（幅 20000・奥行 12000・廊下 1600（中廊下の既定。G135）・住戸の奥行 6000・スパン 3000・中廊下）での、区画の候補
const CELLS = candidateCells({ width_mm: 20000, depth_mm: 12000, corridor_mm: 1600, unit_depth_mm: 6000, span_mm: 3000, layout: '中廊下' }).cells
const first = CELLS[0]!
const second = CELLS[1]!
const centerOf = (c: { x0: number; y0: number; x1: number; y1: number }) => ({ x: (c.x0 + c.x1) / 2, y: (c.y0 + c.y1) / 2 })

const fixture = (id: string, item: FixtureItem, unitId: string | null): Fixture => ({ id, item, unitId })
const htmlOf = (): string => renderToStaticMarkup(createElement(P3Plan))
// タグを除いた文字（隣り合う文字はつながる）
// 開け閉めの印（▸・▾）は aria-hidden の飾りなので文字に入れない（代表の指示『トグルでリスト化』2026-11-07）
const textOf = (html: string): string => html.replace(/<span aria-hidden="true">[^<]*<\/span>/g, '').replace(/<[^>]*>/g, '')
const layerProps = (): FixtureLayerProps => {
  if (!fx.layer) throw new Error('P3 の画面が、什器の層（FixtureLayer）を描いていない')
  return fx.layer as FixtureLayerProps
}
const paletteProps = (): FixturePaletteProps => {
  if (!fx.palette) throw new Error('P3 の画面が、什器の欄（FixturePalette）を描いていない')
  return fx.palette as FixturePaletteProps
}

beforeEach(() => {
  // 初期値による架空の配置ではなく、什器操作の対象となる配置済みの階を用意する。
  const { storeyCount, storeyHeightMm } = useDrawing.getInitialState()
  const volume = { footprint: [{x:0,y:0},{x:20000,y:0},{x:20000,y:12000},{x:0,y:12000}], storey_count:storeyCount, storey_height:storeyHeightMm }
  useSite.setState({volume, slopeBoundaries:[]})
  const candidates = candidateCells({width_mm:20000,depth_mm:12000,corridor_mm:1600,unit_depth_mm:6000,span_mm:3000,layout:'中廊下'})
  const base = generateAutoPlan({targetPerFloor:8,storeyCount,storeyHeightMm,spanMm:3000,unitDepthMm:6000,corridorMm:1600,layout:'中廊下',evCount:1,evStops:[1]})
  const plan = {...base,widthMm:20000,depthMm:12000,cells:CELLS,corridor:candidates.corridor,cores:[],rooms:[],shaftRects:[]}
  useFloorPlans.setState({source:JSON.stringify([volume,[],storeyCount,storeyHeightMm]),plans:{1:plan},selected:1})
  fx.state.fixtures = []
  fx.state.selectedItem = null
  fx.layer = null
  fx.palette = null
  vi.clearAllMocks()
})

describe('P3 の画面に什器の道具が出る（仕様 1）', () => {
  it('右パネルに、見出し「什器」と、5 品目のボタンが品目の並びで出る', () => {
    const text = textOf(htmlOf())
    expect(text).toContain('什器')
    expect(text).toContain('キッチンユニットバス洗面便器収納')
  })

  it('什器の欄へ、店舗の選び・一覧・外す操作と、いまの区画の id（P3 の区画の候補）を渡す', () => {
    const placed = fixture('fixture-1', kitchen, first.id)
    fx.state.selectedItem = kitchen
    fx.state.fixtures = [placed]
    htmlOf()
    const p = paletteProps()
    expect(p.selectedItem).toBe(kitchen)
    expect(p.fixtures).toEqual([placed])
    expect(p.unitIds).toEqual(CELLS.map((c) => c.id))
    expect(p.onSelect).toBe(fx.state.selectItem)
    expect(p.onRemove).toBe(fx.state.remove)
  })

  it('品目を選んでいなければ、選びは null で渡り、どのボタンも押されていない', () => {
    const html = htmlOf()
    expect(paletteProps().selectedItem).toBeNull()
    expect(pressedFixtureButtons(html)).toBe(0)
  })

  it('品目を選んでいれば、その品目のボタンだけが押された状態で描かれる', () => {
    fx.state.selectedItem = toilet
    expect(pressedFixtureButtons(htmlOf())).toBe(1)
  })
})

describe('P3 の平面の区画（仕様 2・3）', () => {
  it('品目を選んでいなければ、区画を押せる四角は出ない', () => {
    const html = htmlOf()
    expect(layerProps().active).toBe(false)
    expect(html).not.toContain('data-unit=')
  })

  it('品目を選んでいれば、区画ごとに押せる四角が 1 つずつ、区画の並びで出る', () => {
    fx.state.selectedItem = kitchen
    const html = htmlOf()
    expect(layerProps().active).toBe(true)
    const ids = [...html.matchAll(/data-unit="([^"]*)"/g)].map((m) => m[1])
    expect(ids).toEqual(CELLS.map((c) => c.id))
    expect(ids.length).toBeGreaterThan(0)
  })

  it('平面の層へは、P3 の区画の候補を渡す', () => {
    htmlOf()
    expect(layerProps().cells).toEqual(CELLS)
  })

  it('区画を押すと、店舗の「選んでいる品目を置く」が、その区画の id で呼ばれる', () => {
    fx.state.selectedItem = kitchen
    htmlOf()
    layerProps().onTap(second.id)
    expect(fx.state.placeSelected).toHaveBeenCalledTimes(1)
    expect(fx.state.placeSelected).toHaveBeenCalledWith(second.id)
  })
})

describe('置いた什器（仕様 4）', () => {
  it('置いた什器は、その区画の中央に品目名で出る', () => {
    fx.state.fixtures = [fixture('fixture-1', kitchen, first.id), fixture('fixture-2', toilet, second.id)]
    const html = htmlOf()
    const a = centerOf(first)
    const b = centerOf(second)
    expect(html).toMatch(new RegExp(`<text x="${a.x}" y="${a.y}"[^>]*>キッチン</text>`))
    expect(html).toMatch(new RegExp(`<text x="${b.x}" y="${b.y}"[^>]*>便器</text>`))
  })

  it('右パネルに、置いた什器の一覧（外すボタン付き）と、種類ごとの件数が出る', () => {
    fx.state.fixtures = [fixture('fixture-1', kitchen, first.id), fixture('fixture-2', kitchen, second.id), fixture('fixture-3', toilet, first.id)]
    const text = textOf(htmlOf())
    expect(text).toContain(`キッチン（区画 ${first.id}）外す`)
    expect(text).toContain(`キッチン（区画 ${second.id}）外す`)
    expect(text).toContain(`便器（区画 ${first.id}）外す`)
    expect(text).toContain('キッチン 2 台ユニットバス 0 台洗面 0 台便器 1 台収納 0 台')
    expect(text).not.toContain('区画なし 1 台')
  })

  it('何も置いていなければ、「まだ置いていません」と、5 品目とも 0 台が出る', () => {
    const text = textOf(htmlOf())
    expect(text).toContain('まだ置いていません')
    expect(text).toContain('キッチン 0 台ユニットバス 0 台洗面 0 台便器 0 台収納 0 台')
  })

  it('区画が無くなった什器は、落とさず一覧に残して「区画なし」に数え、図には出さない', () => {
    fx.state.fixtures = [fixture('fixture-1', kitchen, 'ZZ'), fixture('fixture-2', toilet, first.id)]
    const html = htmlOf()
    const text = textOf(html)
    expect(text).toContain('キッチン（区画なし）外す')
    expect(text).toContain('キッチン 0 台ユニットバス 0 台洗面 0 台便器 1 台収納 0 台区画なし 1 台')
    expect(html).not.toMatch(/<text[^>]*>キッチン<\/text>/)
    expect(html).toMatch(/<text[^>]*>便器<\/text>/)
  })
})

describe('区画の id を店舗に知らせる（仕様 5）', () => {
  it('描くと、いまの区画（P3 の区画の候補）の id を店舗に知らせる', () => {
    htmlOf()
    expect(fx.state.setUnitIds).toHaveBeenCalledWith(CELLS.map((c) => c.id))
  })
})

describe('平面の印を押すと外す（仕様 7）', () => {
  it('平面の層へ、店舗の「外す」を渡す（右パネルの「外す」と同じ操作）', () => {
    fx.state.fixtures = [fixture('fixture-1', kitchen, first.id)]
    htmlOf()
    expect(layerProps().onRemove).toBe(fx.state.remove)
    expect(layerProps().onRemove).toBe(paletteProps().onRemove)
  })

  it('品目を選んでいなければ、置いた什器の印は押せる（印に什器の id が付き、押せなくする none が無い）', () => {
    fx.state.fixtures = [fixture('fixture-1', kitchen, first.id), fixture('fixture-2', toilet, second.id)]
    // 39 案の間取りの図（UnitPlanDrawing）は押せない層（pointer-events="none"）として描かれるので、ページ全体ではなく什器の印そのものを確かめる
    const html = htmlOf()
    const marks = html.match(/<[^>]*data-fixture="[^"]*"[^>]*>/g) ?? []
    expect(marks.map((m) => /data-fixture="([^"]*)"/.exec(m)?.[1])).toEqual(['fixture-1', 'fixture-2'])
    for (const m of marks) expect(m).toContain('pointer-events="auto"')
  })

  it('品目を選んでいる間は、印は押せない（区画を押して続けて置ける）', () => {
    fx.state.selectedItem = kitchen
    fx.state.fixtures = [fixture('fixture-1', kitchen, first.id)]
    const marks = htmlOf().match(/<[^>]*data-fixture="[^"]*"[^>]*>/g) ?? []
    expect(marks).toHaveLength(1)
    expect(marks[0]).toContain('pointer-events="none"')
  })
})

describe('P3 の左メニューに什器の件数が出る（仕様 6）', () => {
  // 左のオブジェクト一覧は、作図モードでは既定で畳まれる（Codex の版を正とする。代表 2026-11-07）。件数はシステムモードで確かめる
  beforeEach(() => {
    modeShell.mode = 'system'
    return () => {
      modeShell.mode = 'drawing'
    }
  })

  // Codex の版を正とする（代表の決定 2026-11-08）: 左メニューから住戸・部屋の行を外した（ObjectMenu）。什器の次は壁の行。住戸の行は無い
  it('置いた什器の数が、廊下の次・壁の前の「什器」の行に出る（区画なしの什器も数える）', () => {
    fx.state.fixtures = [fixture('fixture-1', kitchen, first.id), fixture('fixture-2', toilet, second.id), fixture('fixture-3', kitchen, null)]
    const text = textOf(htmlOf())
    expect(text).toContain('廊下1什器3壁0')
    expect(text).not.toContain(`住戸${CELLS.length}壁`)
  })

  // Codex の版を正とする（代表の決定 2026-11-08）: 左メニューから住戸・部屋の行を外した（ObjectMenu）。什器の次は壁の行。住戸の行は無い
  it('いまの区画に無い区画の什器も、左メニューの件数には数える（右パネルでは「区画なし」）', () => {
    fx.state.fixtures = [fixture('fixture-1', kitchen, 'ZZ'), fixture('fixture-2', toilet, first.id)]
    expect(textOf(htmlOf())).toContain('廊下1什器2壁0')
  })

  // Codex の版を正とする（代表の決定 2026-11-08）: 左メニューから住戸・部屋の行を外した（ObjectMenu）。什器の次は壁の行。住戸の行は無い
  it('何も置いていなければ、「什器」の行は 0', () => {
    expect(textOf(htmlOf())).toContain('廊下1什器0壁0')
  })
})
