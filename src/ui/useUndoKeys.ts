// 画面の Ctrl+Z・Ctrl+Y を、描画の Undo・Redo につなぐ（ハブ A-03 G68）。App に一つだけ置く。
import { useEffect } from 'react'
import { useDrawing } from '../store/drawing'
import { undoActionOf } from './undoKeys'

export function useUndoKeys(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const action = undoActionOf({
        key: e.key,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
        target: (e.target as HTMLElement | null) ?? null,
      })
      if (action === null) return
      e.preventDefault()
      if (action === 'undo') useDrawing.getState().undo()
      else useDrawing.getState().redo()
    }
    // 3D や各パネルが伝播を止める前に、共通ショートカットを受け取る。
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])
}
