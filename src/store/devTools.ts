import { create } from 'zustand'

// 開発用の道具（経緯度・ズーム・区のコード・CityGML・数値入力・回転・機能の調整の欄）を出すかどうか。既定は隠す。☰ メニューの切替で変える。
export interface DevToolsState {
  shown: boolean
  setShown: (shown: boolean) => void
}

export const useDevTools = create<DevToolsState>((set) => ({
  shown: false,
  setShown: (shown) => set({ shown }),
}))
