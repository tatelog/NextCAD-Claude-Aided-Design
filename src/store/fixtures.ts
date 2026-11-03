// 什器の店舗（ハブ A-03 G69、D-04 P3）。P3 で置いた什器の一覧と、パレットで選んでいる品目を持つ。P4 の数量はここを読む。
// 値は保存しない（画面の中だけ）。端末ごとに覚えるかどうかは未決（D-04 未決）。
// 区画の id は、いま P3 にある区画（住戸の区画候補）を P3 が知らせる。区画が無くなった什器は、一覧から落とさず、数えるときに「区画なし」にする。
import { create } from 'zustand'
import { placeFixture, removeFixture, type Fixture, type FixtureItem } from '../plan/fixtures'

export interface FixturesState {
  /** 置いた什器（置いた順） */
  fixtures: Fixture[]
  /** パレットで選んでいる品目。選んでいなければ null（什器の道具を使っていない） */
  selectedItem: FixtureItem | null
  /** いま P3 にある区画の id。P3 が知らせる。まだ知らされていなければ null */
  unitIds: string[] | null
  selectItem: (item: FixtureItem | null) => void
  /** 選んでいる品目を、その区画に 1 つ置く。品目を選んでいなければ何もしない */
  placeSelected: (unitId: string) => void
  remove: (id: string) => void
  setUnitIds: (ids: readonly string[]) => void
}

export const useFixtures = create<FixturesState>((set) => ({
  fixtures: [],
  selectedItem: null,
  unitIds: null,
  selectItem: (selectedItem) => set({ selectedItem }),
  placeSelected: (unitId) => set((s) => (s.selectedItem === null ? s : { fixtures: placeFixture(s.fixtures, s.selectedItem, unitId) })),
  remove: (id) => set((s) => ({ fixtures: removeFixture(s.fixtures, id) })),
  setUnitIds: (ids) => set({ unitIds: [...ids] }),
}))
