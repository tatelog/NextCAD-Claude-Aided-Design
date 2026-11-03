// 案件の読み込み（保存した JSON を、画面の状態に戻せる形にする）。読むのは保存（saveData.ts の buildSaveData）の形だけ。
// 形が合わなければ例外にする（読む前の画面の状態は変えない）。意味づけ（種類・要確認）は保存していないので、読んだあとの扱いは画面側で空に戻す。
import { z } from 'zod'
import { NodeSchema, SegmentSchema, StrokeSchema } from '../model/schema'
import { FIXTURE_ITEMS, type Fixture, type FixtureItem } from '../plan/fixtures'
import { MAX_STOREYS } from '../volume/knobs3d'
import { useDrawing } from '../store/drawing'
import { useFixtures } from '../store/fixtures'
import { useSemantic } from '../store/semantic'

const EntrySchema = z.object({
  stroke: StrokeSchema,
  segments: z.array(SegmentSchema),
  nodes: z.array(NodeSchema),
})

const FixtureSchema = z.object({
  id: z.string().min(1),
  item: z.string().refine((s) => FIXTURE_ITEMS.some((i) => i.id === s), '品目が既知の 5 つにありません'),
  unitId: z.string().nullable(),
})

const SaveSchema = z.object({
  projectName: z.string(),
  savedAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), '保存日時が日時の形ではありません'),
  entries: z.array(EntrySchema),
  storeyCount: z.number().int().min(1).max(MAX_STOREYS),
  storeyHeightMm: z.number().int().positive(),
  // 什器が無い古い保存には無い
  fixtures: z.array(FixtureSchema).optional(),
  // 単価の入力が無い古い保存には無い（利用者が入れた単価。文字だけ）
  unitPriceTexts: z.record(z.string(), z.string()).optional(),
})

export interface LoadedProject {
  projectName: string
  savedAt: Date
  entries: z.infer<typeof EntrySchema>[]
  storeyCount: number
  storeyHeightMm: number
  fixtures: Fixture[]
  unitPriceTexts: Record<string, string>
}

/** 保存の JSON（すでに JSON.parse 済みの値）を読む。形が合わなければ例外。 */
export function parseSaveData(json: unknown): LoadedProject {
  const d = SaveSchema.parse(json)
  return {
    projectName: d.projectName,
    savedAt: new Date(d.savedAt),
    entries: d.entries,
    storeyCount: d.storeyCount,
    storeyHeightMm: d.storeyHeightMm,
    fixtures: (d.fixtures ?? []).map((f) => ({ id: f.id, item: f.item as FixtureItem, unitId: f.unitId })),
    unitPriceTexts: d.unitPriceTexts ?? {},
  }
}

/** 読んだ案件を、画面の状態に入れる。Undo・Redo の履歴と種類（意味づけ）は、保存していないので空に戻す。 */
export function applyLoadedProject(p: LoadedProject): void {
  useDrawing.setState({ entries: p.entries, past: [], redoStack: [], storeyCount: p.storeyCount, storeyHeightMm: p.storeyHeightMm, fitted: false })
  useFixtures.setState({ fixtures: p.fixtures, unitPriceTexts: p.unitPriceTexts })
  useSemantic.getState().clear()
}
