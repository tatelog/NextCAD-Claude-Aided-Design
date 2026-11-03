// 画面の切り替え（D-04 共通ヘッダーの流れ P1〜P4、出力 P5）。
// 決まっていない値は各画面に「未決」と明記し、推測で埋めない。
import { useState } from 'react'
import { P03Volume } from './ui/P03Volume'
import { P1Site } from './ui/P1Site'
import { P3Plan } from './ui/P3Plan'
import { P4Estimate } from './ui/P4Estimate'
import { P5Output } from './ui/P5Output'

const SCREENS = [
  { id: 'P1', name: '敷地' },
  { id: 'P2', name: 'ボリューム' },
  { id: 'P3', name: '平面' },
  { id: 'P4', name: '積算' },
  { id: 'P5', name: '出力' },
] as const

type ScreenId = (typeof SCREENS)[number]['id']

export function App() {
  const [screen, setScreen] = useState<ScreenId>('P2')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <nav style={{ display: 'flex', gap: 6, padding: '6px 12px', borderBottom: '1px solid #ddd8cc', background: '#fff' }}>
        {SCREENS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={screen === s.id ? 'is-active' : undefined}
            aria-pressed={screen === s.id}
            onClick={() => setScreen(s.id)}
            style={{ font: 'inherit', padding: '4px 10px', border: '1px solid #b8b2a4', borderRadius: 6, background: screen === s.id ? '#1f2a44' : '#fff', color: screen === s.id ? '#fff' : '#1f2a44', cursor: 'pointer' }}
          >
            {s.id} {s.name}
          </button>
        ))}
      </nav>
      <div style={{ flex: 1, minHeight: 0 }}>
        {screen === 'P1' && <P1Site />}
        {screen === 'P2' && <P03Volume />}
        {screen === 'P3' && <P3Plan />}
        {screen === 'P4' && <P4Estimate />}
        {screen === 'P5' && <P5Output />}
      </div>
    </div>
  )
}
