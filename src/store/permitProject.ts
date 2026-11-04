// 案件のうち、ボリュームから決まらない条件（構造・用途・敷地の区域・設備・申請の形）（t91・G46）。P5 で入れる。
// 既定は RC・共同住宅（板状マンションの想定）。ほかは「いいえ」。画面を替えても値は保つ。
import { create } from 'zustand'
import type { PermitProject } from '../law/permitInput'

export interface PermitProjectState {
  project: PermitProject
  set: <K extends keyof PermitProject>(key: K, value: PermitProject[K]) => void
}

const DEFAULT_PROJECT: PermitProject = {
  structure: 'RC',
  usage: '共同住宅',
  inShadowRegulationArea: false,
  structuralCalc: false,
  hasAgent: false,
  bimSubmission: false,
  usesCertifiedParts: false,
  hasBuildingEquipment: false,
  hasElevator: false,
}

export const usePermitProject = create<PermitProjectState>((set) => ({
  project: DEFAULT_PROJECT,
  set: (key, value) => set((s) => ({ project: { ...s.project, [key]: value } })),
}))
