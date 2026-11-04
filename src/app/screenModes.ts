// 画面ごとに使えるモードと、右のメニューバーの中身（ハブ A-03 G100・G95・G88、統括の依頼 t57）。決定論。
// 表は src/config/screenModes.json（D-04 2b の草案を写した設定）。表を変えても、この関数は変えずに済む。
// モードの名前は仮。コードの id（system・chat・draw）は変えない。
import { z } from 'zod'
import raw from '../config/screenModes.json'

const IdSchema = z.string().min(1)

const ModeSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  available: z.boolean(),
  /** このモードのとき、右のメニューバーに出す項目（右パネルの項目の ID） */
  rightTiles: z.array(IdSchema),
  /** このモードのとき、画面の項目のうち出さないもの（右パネルの項目の ID。G127: Drawing では意味づけの確認を出さない） */
  hidesTiles: z.array(IdSchema).default([]),
})

const ScreenSchema = z.object({
  id: IdSchema,
  /** この画面で使えるモードの id（available が false のモードは、ここに挙げても出ない） */
  modes: z.array(IdSchema),
  /** この画面の項目（右パネルの項目の ID）。モードによらず出す */
  screenTiles: z.array(IdSchema),
})

const ScreenModesSchema = z
  .object({
    modes: z.array(ModeSchema),
    screens: z.array(ScreenSchema),
  })
  .superRefine((cfg, ctx) => {
    const ids = new Set(cfg.modes.map((m) => m.id))
    for (const s of cfg.screens) {
      for (const m of s.modes) {
        if (!ids.has(m)) ctx.addIssue({ code: 'custom', message: `画面 ${s.id} が知らないモード: ${m}`, path: ['screens'] })
      }
    }
  })

export type ModeDef = z.infer<typeof ModeSchema>
export type ScreenDef = z.infer<typeof ScreenSchema>
export type ScreenModesConfig = z.infer<typeof ScreenModesSchema>

/** 表を読む。形が合わない・画面が知らないモードを挙げた表は例外 */
export function parseScreenModes(input: unknown): ScreenModesConfig {
  return ScreenModesSchema.parse(input)
}

export const SCREEN_MODES: ScreenModesConfig = parseScreenModes(raw)

/** その画面で使えるモード（使えるものだけ。表の並び） */
export function modesOfScreen(cfg: ScreenModesConfig, screen: string): ModeDef[] {
  const s = cfg.screens.find((x) => x.id === screen)
  if (s === undefined) return []
  return s.modes.map((id) => cfg.modes.find((m) => m.id === id)).filter((m): m is ModeDef => m !== undefined && m.available)
}

/** モードの名前（表から。仮） */
export function modeName(cfg: ScreenModesConfig, id: string): string {
  return cfg.modes.find((m) => m.id === id)?.name ?? id
}

/** このモードで出さない画面の項目（G127。表の hidesTiles）。モードが無ければ空 */
export function hidesTilesOf(cfg: ScreenModesConfig, mode: string): string[] {
  return cfg.modes.find((m) => m.id === mode)?.hidesTiles ?? []
}

/**
 * 右のメニューバーに出す項目（右パネルの項目の ID）。その画面で使えるモードの項目だけ。
 * 並びは、画面の項目（画面別。このモードで隠すものを除く）→ モードの項目。使えないモードの項目は出ない。
 */
export function rightBarItems(cfg: ScreenModesConfig, mode: string, screen: string): string[] {
  const s = cfg.screens.find((x) => x.id === screen)
  if (s === undefined) return []
  const def = modesOfScreen(cfg, screen).find((m) => m.id === mode)
  const hidden = def?.hidesTiles ?? []
  return [...s.screenTiles.filter((t) => !hidden.includes(t)), ...(def?.rightTiles ?? [])]
}
