// P1 で取った用途地域（PLATEAU）を、P2 の斜線と容積率の限度に渡すための共有の状態。
// 値は保存しない（画面の中だけ）。取り直したら上書きする。
import { create } from 'zustand'
import type { UseDistrict } from '../plateau/urf'

interface SiteState {
  matches: UseDistrict[] | null
  setMatches: (matches: UseDistrict[] | null) => void
}

export const useSite = create<SiteState>((set) => ({
  matches: null,
  setMatches: (matches) => set({ matches }),
}))
