// 取り込んだ様式の置き場（統括の依頼 2026-11-06。2-a）。画面の中（店舗）だけに持つ。保存もせず、どこへも送らない。
import { create } from 'zustand'
import type { FormKind } from '../law/permitFormKind'

export interface TakenForm {
  fileName: string
  bytes: Uint8Array
  paragraphs: string[]
}

export interface PermitFormsState {
  forms: Partial<Record<FormKind, TakenForm>>
  importForm: (kind: FormKind, fileName: string, bytes: Uint8Array, paragraphs: string[]) => void
  removeForm: (kind: FormKind) => void
}

export const usePermitForms = create<PermitFormsState>((set) => ({
  forms: {},
  importForm: (kind, fileName, bytes, paragraphs) => set((s) => ({ forms: { ...s.forms, [kind]: { fileName, bytes, paragraphs } } })),
  removeForm: (kind) =>
    set((s) => {
      const next = { ...s.forms }
      delete next[kind]
      return { forms: next }
    }),
}))
