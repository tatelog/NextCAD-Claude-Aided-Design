// メニューの折りたたみ節（ハブ A-03 G74「メニュー構成」・G43）。見出しを押すと、中身を開閉する。画面の状態だけを持つ（保存しない）。
import { useState, type ReactNode } from 'react'

export interface FoldProps {
  title: string
  /** 初めに開いているか。省略は開いている */
  defaultOpen?: boolean
  children?: ReactNode
}

export function Fold({ title, defaultOpen = true, children }: FoldProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section style={{ marginBottom: 10, paddingTop: 8, borderTop: '1px solid #ddd8cc' }}>
      <button
        type="button"
        className="menu-fold-heading"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{ display: 'block', width: '100%', padding: '2px 0', border: 0, background: 'transparent', font: 'inherit', fontSize: 13, fontWeight: 700, textAlign: 'left', cursor: 'pointer', color: 'inherit' }}
      >
        {`${open ? '▾' : '▸'} ${title}`}
      </button>
      {open ? <div style={{ marginTop: 6 }}>{children}</div> : null}
    </section>
  )
}
