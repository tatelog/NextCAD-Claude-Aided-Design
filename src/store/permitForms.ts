// 取り込んだ様式の置き場（統括の依頼 2026-11-06。2-a）。画面の中（店舗）だけに持つ。保存もせず、どこへも送らない。
import { create } from 'zustand'
import type { FormKind } from '../law/permitFormKind'

export interface TakenForm {
  fileName: string
  bytes: Uint8Array
  paragraphs: string[]
}

export interface FilledForm {
  fileName: string
  bytes: Uint8Array
}

export interface PermitFormsState {
  forms: Partial<Record<FormKind, TakenForm>>
  /** 欄に値を入れて書き出した docx（一式の zip の 01_申請書/ に入る）。画面の中だけに持つ */
  filled: Partial<Record<FormKind, FilledForm>>
  importForm: (kind: FormKind, fileName: string, bytes: Uint8Array, paragraphs: string[]) => void
  removeForm: (kind: FormKind) => void
  setFilled: (kind: FormKind, fileName: string, bytes: Uint8Array) => void
  clearFilled: (kind: FormKind) => void
}

export const usePermitForms = create<PermitFormsState>((set) => ({
  forms: {},
  filled: {},
  setFilled: (kind, fileName, bytes) => set((s) => ({ filled: { ...s.filled, [kind]: { fileName, bytes } } })),
  clearFilled: (kind) =>
    set((s) => {
      const next = { ...s.filled }
      delete next[kind]
      return { filled: next }
    }),
  importForm: (kind, fileName, bytes, paragraphs) => set((s) => ({ forms: { ...s.forms, [kind]: { fileName, bytes, paragraphs } } })),
  removeForm: (kind) =>
    set((s) => {
      const next = { ...s.forms }
      delete next[kind]
      return { forms: next }
    }),
}))
