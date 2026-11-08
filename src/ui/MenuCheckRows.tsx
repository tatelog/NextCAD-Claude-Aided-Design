// メニューのチェック付きの行（ハブ A-03 G43・G73・G74、統括の依頼 t51）。行の先頭に SVG のチェックを出し、押すと、その項目を入れる・外す。
import type { MenuGroup } from './menuGroups'

/** 行の先頭のチェック（SVG）。入っているときだけ、チェックの印を描く */
function CheckIcon({ on }: { on: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" data-check={on ? 'on' : 'off'} style={{ flex: 'none' }}>
      {on ? <path d="M4 8.5 L7 11.5 L12 5" fill="none" stroke="#6b7077" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> : null}
    </svg>
  )
}

export interface MenuCheckRowsProps {
  groups: readonly MenuGroup[]
  /** 行を押したとき。shown は押した後の状態（入れるなら true） */
  onToggle: (id: string, shown: boolean) => void
}

export function MenuCheckRows({ groups, onToggle }: MenuCheckRowsProps) {
  return (
    <>
      {groups.map((g) => (
        <div key={g.heading} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: '#5b6670', marginBottom: 4 }}>{g.heading}</div>
          {g.rows.map((r) => (
            <button
              key={r.id}
              type="button"
              className="menu-check-row"
              role="checkbox"
              aria-checked={r.shown}
              onClick={() => onToggle(r.id, !r.shown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 8,
                width: 'calc(100% - 1.5em)',
                marginLeft: '1.5em',
                padding: '4px 0',
                border: 0,
                background: 'transparent',
                font: 'inherit',
                fontSize: 13,
                textAlign: 'left',
                cursor: 'pointer',
                color: 'inherit',
              }}
            >
              <CheckIcon on={r.shown} />
              <span>{r.title}</span>
            </button>
          ))}
        </div>
      ))}
    </>
  )
}
