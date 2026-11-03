// 1F の共用部の名前（ハブ A-03 G75）。基準階の区画に、利用者が 1F の名前（エントランス・ロビーなど）を付けて表す。画面の中だけで持つ（保存はしない）。
import { create } from 'zustand'

export interface FirstFloorState {
  /** 区画の id → 1F の名前。付いていない区画は含まない */
  names: Record<string, string>
  /** 名前を付ける。null で外す。ほかの区画は変えない */
  setName: (cellId: string, name: string | null) => void
  reset: () => void
}

export const useFirstFloor = create<FirstFloorState>((set) => ({
  names: {},
  setName: (cellId, name) =>
    set((s) => {
      const next = { ...s.names }
      if (name === null) delete next[cellId]
      else next[cellId] = name
      return { names: next }
    }),
  reset: () => set({ names: {} }),
}))
