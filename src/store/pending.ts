// 保留の一覧（ハブ A-03 G31・G32）。再試行しても失敗した判定を積む。作業は止めない。件数はヘッダーの「保留 N」に出す。
// 画面の中だけで持つ（保存はしない）。判定そのものは、まだ Worker に接続していないので、ここに積まれるものはまだ無い。
import { create } from 'zustand'

export interface PendingItem {
  id: string
  /** 何の判定か（例: 斜線の判定） */
  label: string
  /** 再試行でも失敗した理由 */
  error: string
  /** 積んだ時刻（ISO） */
  at: string
}

export interface PendingState {
  items: PendingItem[]
  add: (item: PendingItem) => void
  remove: (id: string) => void
  clear: () => void
}

export const usePending = create<PendingState>((set) => ({
  items: [],
  add: (item) => set((s) => ({ items: [...s.items, item] })),
  remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  clear: () => set({ items: [] }),
}))
