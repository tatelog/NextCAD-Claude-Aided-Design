// モードの切替（ハブ A-03 G100・G125。代表「かな」2026-11-05 の仮決め）。ヘッダー右端（作業履歴の直前）に、画面で使えるモードを表の順に並べる。
// 使えるモードが一つだけの画面（P5）は、切替を出さない（2b の表）。名前は表（screenModes の name）から出す。
import { modesOfScreen, SCREEN_MODES } from '../app/screenModes'

export interface ModeSwitchProps {
  /** 画面（P1〜P5） */
  screen: string
  /** 今のモード（画面で使える形。useActiveMode の値） */
  activeMode: string
  /** モードを押した */
  onPick: (mode: string) => void
}

const modeButton = (pressed: boolean) =>
  ({
    font: 'inherit',
    fontSize: 12,
    padding: '2px 8px',
    border: '1px solid #b8b2a4',
    borderRadius: 4,
    cursor: 'pointer',
    background: pressed ? '#1f2a44' : '#fff',
    color: pressed ? '#fff' : '#1f2a44',
  }) as const

export function ModeSwitch({ screen, activeMode, onPick }: ModeSwitchProps) {
  const modes = modesOfScreen(SCREEN_MODES, screen)
  if (modes.length <= 1) return null
  return (
    <div role="group" aria-label="モード" style={{ display: 'flex', gap: 4 }}>
      {modes.map((m) => (
        <button key={m.id} type="button" aria-pressed={activeMode === m.id} onClick={() => onPick(m.id)} style={modeButton(activeMode === m.id)}>
          {m.name}
        </button>
      ))}
    </div>
  )
}
