// 選んでいる線の id（ハブ A-03 G142、統括の依頼 t55 の残り）。チャットの文脈の「選んだ周辺」に渡す。
// 画面の中だけで持つ（保存はしない）。まだ選ぶ操作の画面（UI）は無いので、書き込む箇所は無い（選ぶ UI が決まったら、そこから置く）。
import { create } from 'zustand'

export interface SelectionState {
  /** 選んでいる線の id（同じ id は一度だけ。並びは選んだ順） */
  segmentIds: string[]
  setSegmentIds: (ids: readonly string[]) => void
  clearSelection: () => void
}

export const useSelection = create<SelectionState>((set) => ({
  segmentIds: [],
  setSegmentIds: (ids) => set({ segmentIds: [...new Set(ids)] }),
  clearSelection: () => set({ segmentIds: [] }),
}))
