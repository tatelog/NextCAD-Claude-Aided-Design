// 作業のモード（ハブ A-03 G100・G95・G43、統括の依頼 t57）。システム（1）・チャット（2）・ドロー（3）。モード名は仮。コードの id は変えない。
// 切り替えると、そのモードの右メニューの項目を開く。右メニューに何が出るかは、モードと画面の組で決まる（表 screenModes）。
// ドロー（3）は表で使えない（t54 の仕様が出るまで）。
import { create } from 'zustand'
import { modesOfScreen, rightBarItems, SCREEN_MODES, type ScreenModesConfig } from '../app/screenModes'
import { usePanelTiles } from './panelTiles'

export type WorkMode = 'system' | 'chat' | 'draw'

export interface ModeState {
  mode: WorkMode
  /** モードを切り替える。そのモードの右メニューの項目は、閉じていても開く */
  setMode: (mode: WorkMode) => void
}

export const useMode = create<ModeState>((set) => ({
  mode: 'system',
  setMode: (mode) => {
    set({ mode })
    const tiles = SCREEN_MODES.modes.find((m) => m.id === mode)?.rightTiles ?? []
    for (const id of tiles) usePanelTiles.getState().showTile(id)
  },
}))

/** 画面で扱う今のモード。画面で使えないモードのときは、その画面で使える最初のモード（仕様 5） */
export function activeModeOf(cfg: ScreenModesConfig, mode: string, screen: string): string {
  const usable = modesOfScreen(cfg, screen)
  if (usable.some((m) => m.id === mode)) return mode
  return usable[0]?.id ?? mode
}

/** 画面で扱う今のモード（画面ごとに、使えるモードへ寄せる） */
export function useActiveMode(screen: string): string {
  const mode = useMode((s) => s.mode)
  return activeModeOf(SCREEN_MODES, mode, screen)
}

/** 右メニューに、この項目が出るか（モードと画面の組で決まる。× で閉じた項目は出ない） */
export function isRightItemShown(
  cfg: ScreenModesConfig,
  mode: string,
  screen: string,
  hidden: Readonly<Record<string, true>>,
  id: string,
): boolean {
  return !hidden[id] && rightBarItems(cfg, mode, screen).includes(id)
}
