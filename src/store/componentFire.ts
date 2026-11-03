// 部材の耐火時間（分）の入力（ハブ A-03 G28）。画面の中だけで持つ（保存はしない）。入力が無い部材は null として扱う（判定不能）。
import { create } from 'zustand'
import type { Component } from '../law/structureFire'

export interface ComponentFireState {
  /** 部材 → 耐火時間（分）。入力が無い部材は含めない */
  ratings: Partial<Record<Component, number>>
  setRating: (component: Component, minutes: number | null) => void
  reset: () => void
}

export const useComponentFire = create<ComponentFireState>((set) => ({
  ratings: {},
  setRating: (component, minutes) =>
    set((s) => {
      const next = { ...s.ratings }
      if (minutes === null) delete next[component]
      else next[component] = minutes
      return { ratings: next }
    }),
  reset: () => set({ ratings: {} }),
}))
