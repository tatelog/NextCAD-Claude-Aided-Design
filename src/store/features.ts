// 機能のオンオフ（ハブ A-03 G70、D-04 共通部品「機能のオンオフ」）。項目の中身は画面側の案（未決。仮置き）。
// 表示の 5 つと入力スナップは、既存の画面の状態（ui 店舗）とつながる。残りは設定だけ持ち、振る舞いへの接続は別の作業（未接続と出す）。
import { create } from 'zustand'
import type { UiState } from './ui'

export type FeatureGroup = '表示' | '操作' | '計算'

/** 機能のキー（14 個）。順は一覧の順 */
export const FEATURE_KEYS = [
  'showShadow',
  'showNeighbors',
  'showDimensions',
  'showGrid',
  'showMiniMap',
  'rotateDisplay',
  'rotateOperation',
  'inputSnap',
  'endpointRing',
  'circleMenu',
  'knobs',
  'classifyClaude',
  'shadowRecalc',
  'autoSave',
] as const

export type FeatureKey = (typeof FEATURE_KEYS)[number]

export interface FeatureItem {
  key: FeatureKey
  group: FeatureGroup
  label: string
  /** 振る舞いにつながっているか。つながっていない項目は、画面に「未接続」と出す */
  connected: boolean
}

export const FEATURE_ITEMS: readonly FeatureItem[] = [
  { key: 'showShadow', group: '表示', label: '日影（P2 の 3D の地面）', connected: true },
  { key: 'showNeighbors', group: '表示', label: '周辺建物（P1 の地図と P2 の 3D）', connected: true },
  { key: 'showDimensions', group: '表示', label: '寸法線（P3 の平面）', connected: true },
  { key: 'showGrid', group: '表示', label: 'グリッド（P3 の平面）', connected: true },
  { key: 'showMiniMap', group: '表示', label: '全体図（右下の縮図）', connected: true },
  { key: 'rotateDisplay', group: '操作', label: '回転表示', connected: false },
  { key: 'rotateOperation', group: '操作', label: '回転操作', connected: false },
  { key: 'inputSnap', group: '操作', label: '入力スナップ', connected: true },
  { key: 'endpointRing', group: '操作', label: '端点の輪', connected: false },
  { key: 'circleMenu', group: '操作', label: 'サークルメニュー', connected: false },
  { key: 'knobs', group: '操作', label: 'つまみ', connected: false },
  { key: 'classifyClaude', group: '計算', label: '意味づけ（Claude）', connected: false },
  { key: 'shadowRecalc', group: '計算', label: '斜線・日影の再計算', connected: false },
  { key: 'autoSave', group: '計算', label: '自動保存', connected: false },
]

/** 機能の一つをオンオフしたときに、画面の状態へ出す変更。つながっていない項目は null（何も変えない） */
export function featureUiPatch(key: FeatureKey, on: boolean): Partial<UiState> | null {
  switch (key) {
    case 'showShadow':
      return { showShadow: on }
    case 'showNeighbors':
      return { showNeighbors: on }
    case 'showDimensions':
      return { showDimensions: on }
    case 'showGrid':
      return { showGrid: on }
    case 'showMiniMap':
      return { showMiniMap: on }
    case 'inputSnap':
      return { inputSnapGrid: on }
    default:
      return null
  }
}

export interface FeaturesState {
  on: Record<FeatureKey, boolean>
  setOn: (key: FeatureKey, on: boolean) => void
  reset: () => void
}

const ALL_ON = Object.fromEntries(FEATURE_ITEMS.map((i) => [i.key, true])) as Record<FeatureKey, boolean>

export const useFeatures = create<FeaturesState>((set) => ({
  on: ALL_ON,
  setOn: (key, on) => set((s) => ({ on: { ...s.on, [key]: on } })),
  reset: () => set({ on: ALL_ON }),
}))
