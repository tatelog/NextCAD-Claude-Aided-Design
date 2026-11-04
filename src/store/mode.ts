// 作業のモード（ハブ A-03 G95・G43、統括の依頼 t55）。描画（今作っているシステム）と Claude の二つ。
// モードを切り替えると、そのモードの右パネルの項目を開き、もう一方の項目を閉じる。描画では機能の調整（G43）、Claude ではチャット（G95）。
// モード 3（デジタイザ、G98）は、t54 の仕様が出るまで入れない。
import { create } from 'zustand'
import { usePanelTiles } from './panelTiles'

export type WorkMode = 'draw' | 'claude'

export const MODE_NAMES: Record<WorkMode, string> = { draw: '描画', claude: 'Claude' }

/** モードごとに開く項目と閉じる項目（右パネルの項目の ID） */
export const TILE_OF_MODE: Record<WorkMode, { open: string; close: string }> = {
  draw: { open: 'feature-adjust', close: 'claude-chat' },
  claude: { open: 'claude-chat', close: 'feature-adjust' },
}

export interface ModeState {
  mode: WorkMode
  /** モードを切り替える。同じモードでも、そのモードの項目は開く（閉じていても） */
  setMode: (mode: WorkMode) => void
}

export const useMode = create<ModeState>((set) => ({
  mode: 'draw',
  setMode: (mode) => {
    set({ mode })
    usePanelTiles.getState().showTile(TILE_OF_MODE[mode].open)
    usePanelTiles.getState().hideTile(TILE_OF_MODE[mode].close)
  },
}))

// 既定は描画なので、チャットは最初は閉じておく（G95）
usePanelTiles.getState().hideTile(TILE_OF_MODE.draw.close)
