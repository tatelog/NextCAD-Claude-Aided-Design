// P3 の画面の入力（文字のまま）。画面を離れても残す（統括の依頼 2026-11-06。依頼 3）。
// 既定の値は、今の P3 の既定と同じ。画面は useP3Field（src/ui/useP3Field.ts）で、useState と同じ形に読み書きする。
import { create } from 'zustand'
import type { StairFinish } from '../plan/autoPlan'
import type { CorridorLayout } from '../plan/candidateCells'
import { corridorDefaultOf } from '../plan/corridorDefaults'
import type { CoreRectText } from '../plan/coreRect'
import type { RoomPattern } from '../plan/rooms'

export interface P3InputValues {
  widthText: string
  depthText: string
  corridorText: string
  unitDepthText: string
  spanText: string
  minText: string
  maxText: string
  layoutText: CorridorLayout
  stairFinishText: StairFinish
  unitTypeIdsText: string
  patternText: RoomPattern
  targetText: string
  coreText: CoreRectText
  evCountText: string
}

/** 既定の値（今までの P3 の useState の既定と同じ。廊下幅は廊下タイプから。G135） */
export const P3_INPUT_DEFAULTS: P3InputValues = {
  widthText: '20000',
  depthText: '12000',
  corridorText: String(corridorDefaultOf('中廊下')?.mm ?? 2000),
  unitDepthText: '6000',
  spanText: '3000',
  minText: '',
  maxText: '',
  layoutText: '中廊下',
  stairFinishText: 'indoorShaft',
  unitTypeIdsText: 'T-08-2LDK',
  patternText: '田の字',
  targetText: '',
  coreText: { x0: '', y0: '', x1: '', y1: '' },
  evCountText: '2',
}

export interface P3InputState {
  values: P3InputValues
  setValue: <K extends keyof P3InputValues>(key: K, value: P3InputValues[K]) => void
}

export const useP3Input = create<P3InputState>((set) => ({
  values: { ...P3_INPUT_DEFAULTS },
  setValue: (key, value) => set((s) => ({ values: { ...s.values, [key]: value } })),
}))
