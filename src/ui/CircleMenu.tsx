// サークルメニュー（G52）。右クリックかダブルタップで、その位置に同じ道具を出す。
// 押した道具を使ったら閉じる。外側を押しても閉じる（呼び出し側の canvas が閉じる）。
import { useDrawing } from '../store/drawing'
import { useUi } from '../store/ui'
import './pen.css'

export function CircleMenu() {
  const at = useUi((s) => s.circleMenu)
  const close = useUi((s) => s.closeCircleMenu)
  const setPenMode = useUi((s) => s.setPenMode)
  const penMode = useUi((s) => s.penMode)
  const undo = useDrawing((s) => s.undo)
  const redo = useDrawing((s) => s.redo)
  if (!at) return null

  const items: { label: string; run: () => void; active?: boolean }[] = [
    { label: '直線', run: () => setPenMode('line'), active: penMode === 'line' },
    { label: '曲線', run: () => setPenMode('curve'), active: penMode === 'curve' },
    { label: 'Undo', run: undo },
    { label: 'Redo', run: redo },
  ]

  return (
    <div className="circle-menu" role="menu" style={{ left: at.x, top: at.y }} onPointerDown={(e) => e.stopPropagation()}>
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          role="menuitem"
          className={it.active ? 'is-active' : undefined}
          onClick={() => {
            it.run()
            close()
          }}
        >
          {it.label}
        </button>
      ))}
      <button type="button" role="menuitem" className="circle-menu-close" onClick={close}>
        閉じる
      </button>
    </div>
  )
}
