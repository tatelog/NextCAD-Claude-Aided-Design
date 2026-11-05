// 案件のうち、ボリュームから決まらない条件（敷地の区域・設備・申請の形）（t91・G46）。P5 で入れる。画面を替えても値は保つ。
// 「はい・いいえ」の項目の既定は未入力（null）。「いいえ」を既定にすると、利用者が答えていないのに図書が黙って要らないになるため（統括の指示 2026-11-06）。
// 構造と用途は持たない。RC・共同住宅に固定（permitInput.ts の APP_STRUCTURE・APP_USAGE。統括の指示 2026-11-06）。
import { create } from 'zustand'
import type { PermitProject } from '../law/permitInput'

export interface PermitProjectState {
  project: PermitProject
  set: <K extends keyof PermitProject>(key: K, value: PermitProject[K]) => void
}

const DEFAULT_PROJECT: PermitProject = {
  inShadowRegulationArea: null,
  structuralCalc: null,
  hasAgent: null,
  bimSubmission: null,
  usesCertifiedParts: null,
  hasBuildingEquipment: null,
  hasElevator: null,
}

export const usePermitProject = create<PermitProjectState>((set) => ({
  project: DEFAULT_PROJECT,
  set: (key, value) => set((s) => ({ project: { ...s.project, [key]: value } })),
}))
