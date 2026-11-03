// P1 で取った用途地域（PLATEAU）と周辺建物を、P2 の斜線・容積率・3D に渡すための共有の状態。
// 値は保存しない（画面の中だけ）。取り直したら上書きする。
import { create } from 'zustand'
import type { UseDistrict } from '../plateau/urf'
import type { PlateauBuilding } from '../plateau/bldg'
import type { Point } from '../geom/viewport'

interface SiteState {
  matches: UseDistrict[] | null
  setMatches: (matches: UseDistrict[] | null) => void
  /** 基準点（P1 の地点）の周辺の建物（PLATEAU）。基準点からの半径内だけ */
  buildings: PlateauBuilding[] | null
  /** 周辺建物を取ったときの基準点 */
  sitePoint: { lat: number; lon: number } | null
  setBuildings: (buildings: PlateauBuilding[] | null, sitePoint: { lat: number; lon: number } | null) => void
  /** 道路斜線の判定（P2）。判定が無ければ null。図書の法的チェックに使う */
  roadSlope: '適合' | '超過' | null
  setRoadSlope: (roadSlope: '適合' | '超過' | null) => void
  /** 日影規制の判定（P2）。規制値が無い用途地域は null。図書の法的チェックに使う */
  shadow: '適合' | '不適合' | null
  setShadow: (shadow: '適合' | '不適合' | null) => void
  /** 外形と階（P2）。P4 の数量の自動拾いと、2D の図に使う。閉じていなければ null */
  volume: { footprint: Point[]; storey_count: number; storey_height: number } | null
  setVolume: (volume: { footprint: Point[]; storey_count: number; storey_height: number } | null) => void
}

export const useSite = create<SiteState>((set) => ({
  matches: null,
  setMatches: (matches) => set({ matches }),
  buildings: null,
  sitePoint: null,
  setBuildings: (buildings, sitePoint) => set({ buildings, sitePoint }),
  roadSlope: null,
  setRoadSlope: (roadSlope) => set({ roadSlope }),
  shadow: null,
  setShadow: (shadow) => set({ shadow }),
  volume: null,
  setVolume: (volume) => set({ volume }),
}))
