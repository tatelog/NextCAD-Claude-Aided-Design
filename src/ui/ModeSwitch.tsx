// モードの切替（ハブ A-03 G100・G125。代表「かな」2026-11-05 の仮決め）。ヘッダー右端（作業履歴の直前）に、画面で使えるモードを表の順に並べる。
// 使えるモードが一つだけの画面（P5）は、切替を出さない（2b の表）。名前は表（screenModes の name）から出す。
import { modesOfScreen, SCREEN_MODES } from '../app/screenModes'
import { HeaderIconButton } from './HeaderIconButton'
import { IconModeChat, IconModeDrawing, IconModeSystem } from './headerIcons'

export interface ModeSwitchProps {
  /** 画面（P1〜P5） */
  screen: string
  /** 今のモード（画面で使える形。useActiveMode の値） */
  activeMode: string
  /** モードを押した */
  onPick: (mode: string) => void
  /** このモードだけ押せる（チュートリアル中は system。代表 2026-11-08）。無ければ全部押せる */
  lockedTo?: string
}

/** モードのアイコン（id は screenModes.json の id。代表の依頼 2026-11-06: 文字を消して、アイコンだけ） */
const iconOfMode = (id: string) => {
  switch (id) {
    case 'chat':
      return <IconModeChat />
    case 'drawing':
      return <IconModeDrawing />
    default:
      return <IconModeSystem />
  }
}

export function ModeSwitch({ screen, activeMode, onPick, lockedTo }: ModeSwitchProps) {
  const modes = modesOfScreen(SCREEN_MODES, screen).filter(mode => screen !== 'P2' || mode.id !== 'drawing')
  if (modes.length <= 1) return null
  return (
    <div role="group" aria-label="モード" style={{ display: 'flex', gap: 4 }}>
      {modes.map((m) => (
        <HeaderIconButton key={m.id} label={m.name} icon={iconOfMode(m.id)} pressed={activeMode === m.id} onClick={() => onPick(m.id)}
          disabled={lockedTo !== undefined && m.id !== lockedTo}
          title={lockedTo !== undefined && m.id !== lockedTo ? 'チュートリアル中は System だけ使えます' : undefined} />
      ))}
    </div>
  )
}
