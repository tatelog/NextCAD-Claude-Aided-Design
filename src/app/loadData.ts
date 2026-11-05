// 案件の読み込み（保存した JSON を、画面の状態に戻せる形にする）。読むのは保存（saveData.ts の buildSaveData）の形だけ。
// 形が合わなければ例外にする（読む前の画面の状態は変えない）。意味づけ（種類・要確認）は保存していないので、読んだあとの扱いは画面側で空に戻す。
import { z } from 'zod'
import { NodeSchema, SegmentSchema, StrokeSchema } from '../model/schema'
import { FIXTURE_ITEMS, type Fixture, type FixtureItem } from '../plan/fixtures'
import { MAX_STOREYS } from '../volume/knobs3d'
import { useDrawing } from '../store/drawing'
import { useFixtures } from '../store/fixtures'
import { useFirstFloor } from '../store/firstFloor'
import { useSemantic } from '../store/semantic'
import { useConfirmedSite, type ConfirmedSite } from '../store/confirmedSite'

// 確定した敷地（統括の依頼 2026-11-06。8）。形が合わなければ例外（読む前の画面は変えない）
const ConfirmedSchema = z.object({
  parcelUid: z.string().nullable(),
  lot: z.array(z.object({ x: z.number(), y: z.number() })).nullable(),
  frame: z.object({ lon0: z.number(), lat0: z.number(), kx: z.number(), ky: z.number(), cx: z.number(), cy: z.number() }).nullable(),
  center: z.object({ lat: z.number(), lon: z.number() }),
  roadEdge: z.number().int().min(0),
})

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
  // 版番号（G32）。版の無い古い保存は 0 として読む
  revision: z.number().int().min(0).optional(),
  // 区画に付けた 1F の名前（G75）。名前の無い古い保存には無い
  firstFloorNames: z.record(z.string(), z.string()).optional(),
  // 確定した敷地。確定の項目が無い古い保存には無い
  confirmedSite: ConfirmedSchema.optional(),
})

export interface LoadedProject {
  projectName: string
  savedAt: Date
  entries: z.infer<typeof EntrySchema>[]
  storeyCount: number
  storeyHeightMm: number
  fixtures: Fixture[]
  unitPriceTexts: Record<string, string>
  /** 版番号（保存のたびに 1 増える。版の無い古い保存は 0） */
  revision: number
  /** 区画に付けた 1F の名前（区画の id → 名前） */
  firstFloorNames: Record<string, string>
  /** 確定した敷地（無ければ null） */
  confirmedSite: ConfirmedSite | null
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
    revision: d.revision ?? 0,
    firstFloorNames: d.firstFloorNames ?? {},
    confirmedSite: d.confirmedSite ?? null,
  }
}

/** 読んだ案件を、画面の状態に入れる。Undo・Redo の履歴と種類（意味づけ）は、保存していないので空に戻す。 */
export function applyLoadedProject(p: LoadedProject): void {
  useDrawing.setState({ entries: p.entries, past: [], redoStack: [], storeyCount: p.storeyCount, storeyHeightMm: p.storeyHeightMm, fitted: false })
  useFixtures.setState({ fixtures: p.fixtures, unitPriceTexts: p.unitPriceTexts })
  useFirstFloor.setState({ names: p.firstFloorNames })
  useSemantic.getState().clear()
  // 読んだ保存の確定した敷地に入れ替える。今いる地点も確定の中心にそろえる（P2 がダミーに戻らない）
  useConfirmedSite.setState({ confirmed: p.confirmedSite, roadEdge: p.confirmedSite?.roadEdge ?? 0, currentSite: p.confirmedSite ? p.confirmedSite.center : null })
}
