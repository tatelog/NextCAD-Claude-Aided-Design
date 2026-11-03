// P1 で取った用途地域（PLATEAU）と周辺建物を、P2 の斜線・容積率・3D に渡すための共有の状態。
// 値は保存しない（画面の中だけ）。取り直したら上書きする。
import { create } from 'zustand'
import type { UseDistrict } from '../plateau/urf'
import type { PlateauBuilding } from '../plateau/bldg'

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
}

export const useSite = create<SiteState>((set) => ({
  matches: null,
  setMatches: (matches) => set({ matches }),
  buildings: null,
  sitePoint: null,
  setBuildings: (buildings, sitePoint) => set({ buildings, sitePoint }),
  roadSlope: null,
  setRoadSlope: (roadSlope) => set({ roadSlope }),
}))
