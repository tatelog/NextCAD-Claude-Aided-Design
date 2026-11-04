// メニューの「右パネルの項目」の行（ハブ A-03 G43・G73・G74、統括の依頼 t51）。行の右側に SVG のチェックを出し、押すと、その項目を右パネルに出す・閉じる（× と同じ状態）。
import type { PanelMenuGroup } from './panelMenuGroups'

/** 行の右側のチェック（SVG）。入っているときだけ、チェックの印を描く */
function CheckIcon({ on }: { on: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" data-check={on ? 'on' : 'off'} style={{ flex: 'none' }}>
      <rect x="1" y="1" width="14" height="14" rx="3" fill="none" stroke="#5b6670" strokeWidth="1.5" />
      {on ? <path d="M4 8.5 L7 11.5 L12 5" fill="none" stroke="#2f7a4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> : null}
    </svg>
  )
}

export interface PanelMenuRowsProps {
  groups: readonly PanelMenuGroup[]
  /** 行を押したとき。shown は押した後の状態（入れるなら true） */
  onToggle: (id: string, shown: boolean) => void
}

export function PanelMenuRows({ groups, onToggle }: PanelMenuRowsProps) {
  return (
    <>
      {groups.map((g) => (
        <div key={g.heading} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: '#5b6670', marginBottom: 4 }}>{g.heading}</div>
          {g.rows.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={r.shown}
              onClick={() => onToggle(r.id, !r.shown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                width: '100%',
                padding: '4px 2px',
                border: 0,
                background: 'transparent',
                font: 'inherit',
                fontSize: 13,
                textAlign: 'left',
                cursor: 'pointer',
                color: 'inherit',
              }}
            >
              <span>{r.title}</span>
              <CheckIcon on={r.shown} />
            </button>
          ))}
        </div>
      ))}
    </>
  )
}
