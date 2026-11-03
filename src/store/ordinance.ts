// 条例の値（ハブ A-03 G15）。人が出典つきで入力し、人が確認する。画面の中だけで持つ（保存はしない）。
import { create } from 'zustand'
import type { OrdinanceEntry } from '../law/ordinance'

export interface OrdinanceStoreState {
  entries: OrdinanceEntry[]
  /** 値と出典を入れる。確認は外れる（入れ直すと、人の確認をやり直す） */
  setEntry: (key: string, value: string, source: string) => void
  /** 確認する。出典が空なら何もしない */
  confirm: (key: string) => void
  clear: (key: string) => void
  reset: () => void
}

export const useOrdinance = create<OrdinanceStoreState>((set) => ({
  entries: [],
  setEntry: (key, value, source) =>
    set((s) => ({ entries: [...s.entries.filter((e) => e.key !== key), { key, value, source, confirmed: false }] })),
  confirm: (key) =>
    set((s) => ({
      entries: s.entries.map((e) => (e.key === key && e.source.trim() !== '' ? { ...e, confirmed: true } : e)),
    })),
  clear: (key) => set((s) => ({ entries: s.entries.filter((e) => e.key !== key) })),
  reset: () => set({ entries: [] }),
}))
