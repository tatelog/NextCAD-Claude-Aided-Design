// 部材の耐火時間（分）、外壁開口部設備が防火設備かの入力（ハブ A-03 G28・G85）、鉄筋の被り厚と継手（G86）。画面の中だけで持つ（保存はしない）。入力が無い部材は null として扱う（判定不能）。
import { create } from 'zustand'
import type { Component } from '../law/structureFire'
import { DEFAULT_REBAR, type RebarCondition } from '../estimate/rebarCondition'

export interface ComponentFireState {
  /** 部材 → 耐火時間（分）。入力が無い部材は含めない */
  ratings: Partial<Record<Component, number>>
  setRating: (component: Component, minutes: number | null) => void
  /** 外壁開口部設備が防火設備か。未入力は null（イの判定は判定不能になる） */
  fireDoor: boolean | null
  setFireDoor: (fireDoor: boolean | null) => void
  /** 鉄筋の条件（仮の条件。係数は仮置き）。既定は被り厚 30 mm・重ね継手 */
  rebar: RebarCondition
  setRebar: (patch: Partial<RebarCondition>) => void
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
  fireDoor: null,
  setFireDoor: (fireDoor) => set({ fireDoor }),
  rebar: DEFAULT_REBAR,
  setRebar: (patch) => set((s) => ({ rebar: { ...s.rebar, ...patch } })),
  reset: () => set({ ratings: {}, fireDoor: null, rebar: DEFAULT_REBAR }),
}))
