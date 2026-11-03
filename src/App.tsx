// 画面の切り替え（D-04 共通ヘッダーの流れ P1〜P4、出力 P5）と、共通ヘッダーの右側（保存・作業履歴・メニュー・保留）。
// 決まっていない値は各画面に「未決」と明記し、推測で埋めない。
import { useEffect, useState } from 'react'
import { P03Volume } from './ui/P03Volume'
import { P1Site } from './ui/P1Site'
import { P3Plan } from './ui/P3Plan'
import { P4Estimate } from './ui/P4Estimate'
import { P5Output } from './ui/P5Output'
import { useDrawing } from './store/drawing'
import { useUi } from './store/ui'
import { buildSaveData } from './app/saveData'
import { openWorkLog, recentWorkLog, recordWorkLog } from './app/workLogStore'

const SCREENS = [
  { id: 'P1', name: '敷地' },
  { id: 'P2', name: 'ボリューム' },
  { id: 'P3', name: '平面' },
  { id: 'P4', name: '積算' },
  { id: 'P5', name: '出力' },
] as const

type ScreenId = (typeof SCREENS)[number]['id']

const button = { font: 'inherit', padding: '4px 10px', border: '1px solid #b8b2a4', borderRadius: 6, background: '#fff', color: '#1f2a44', cursor: 'pointer' } as const

export function App() {
  const [screen, setScreen] = useState<ScreenId>('P2')
  // 案件名（敷地名）。画面の中だけで持つ（保存のときだけ書き出す）
  const [project, setProject] = useState('')
  // 作業履歴（SQLite）の準備ができたか。記録のたびに rev を進めて、一覧を読み直す
  const [logReady, setLogReady] = useState(false)
  const [rev, setRev] = useState(0)
  useEffect(() => {
    openWorkLog().then(
      () => {
        setLogReady(true)
        setRev((r) => r + 1)
      },
      () => setLogReady(false),
    )
  }, [])
  const [panel, setPanel] = useState<'log' | 'menu' | null>(null)
  const showShadow = useUi((s) => s.showShadow)
  const showNeighbors = useUi((s) => s.showNeighbors)
  const showDimensions = useUi((s) => s.showDimensions)
  const showGrid = useUi((s) => s.showGrid)

  const record = (action: string, target: string) => {
    recordWorkLog({ at: new Date().toISOString(), screen, action, target })
    setRev((r) => r + 1)
  }

  const go = (id: ScreenId) => {
    setScreen(id)
    recordWorkLog({ at: new Date().toISOString(), screen: id, action: '切替', target: id })
    setRev((r) => r + 1)
  }

  const save = () => {
    const d = useDrawing.getState()
    const data = buildSaveData({
      projectName: project,
      entries: d.entries,
      storeyCount: d.storeyCount,
      storeyHeightMm: d.storeyHeightMm,
      savedAt: new Date(),
    })
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.projectName}.json`
    a.click()
    URL.revokeObjectURL(url)
    record('保存', data.projectName)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', background: '#fff' }}>
        <input
          aria-label="案件名（敷地名）"
          placeholder="敷地名（案件）"
          value={project}
          onChange={(e) => setProject(e.target.value)}
          style={{ font: 'inherit', fontWeight: 700, border: '1px solid transparent', padding: '2px 6px', minWidth: 200 }}
        />
        <span style={{ fontSize: 11, color: '#c8412a', border: '1px solid #c8412a', borderRadius: 3, padding: '0 6px' }}>議論用・未確定</span>
        <span style={{ flex: 1 }} />
        <span title="Claude の判定の失敗は、まだ数えていない（P3 の意味づけを接続したら数える）" style={{ fontSize: 12, color: '#5b6670' }}>
          保留 0
        </span>
        <button type="button" style={button} onClick={save}>
          保存
        </button>
        <button type="button" style={button} onClick={() => setPanel(panel === 'log' ? null : 'log')} aria-pressed={panel === 'log'}>
          作業履歴
        </button>
        <button type="button" style={button} onClick={() => setPanel(panel === 'menu' ? null : 'menu')} aria-pressed={panel === 'menu'}>
          メニュー
        </button>
      </header>
      <nav style={{ display: 'flex', gap: 6, padding: '6px 12px', borderBottom: '1px solid #ddd8cc', background: '#fff' }}>
        {SCREENS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={screen === s.id ? 'is-active' : undefined}
            aria-pressed={screen === s.id}
            onClick={() => go(s.id)}
            style={{ ...button, background: screen === s.id ? '#1f2a44' : '#fff', color: screen === s.id ? '#fff' : '#1f2a44' }}
          >
            {s.id} {s.name}
          </button>
        ))}
      </nav>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {screen === 'P1' && <P1Site />}
        {screen === 'P2' && <P03Volume />}
        {screen === 'P3' && <P3Plan />}
        {screen === 'P4' && <P4Estimate />}
        {screen === 'P5' && <P5Output />}
        {panel !== null && (
          <aside style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 320, background: '#fff', borderLeft: '1px solid #ddd8cc', padding: 12, overflowY: 'auto', zIndex: 5 }}>
            {panel === 'log' && (
              <>
                <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>作業履歴（同じブラウザに残る）</h2>
                <p style={{ fontSize: 11, color: '#666' }}>SQLite（sql.js）の表から新しい順に読む。この同じブラウザの中に保存する。</p>
                {!logReady && <p style={{ fontSize: 13 }}>作業履歴を準備しています（SQLite）。</p>}
                {logReady && recentWorkLog(200).length === 0 && <p style={{ fontSize: 13 }}>まだ操作がありません。</p>}
                <ol style={{ paddingLeft: 18, fontSize: 12 }} data-rev={rev}>
                  {recentWorkLog(200).map((l) => (
                    <li key={l.id}>
                      {l.at.slice(11, 19)} {l.screen} {l.action} {l.target}
                    </li>
                  ))}
                </ol>
              </>
            )}
            {panel === 'menu' && (
              <>
                <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>表示（機能のオンオフ）</h2>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={showShadow}
                    onChange={(e) => {
                      useUi.getState().setShowShadow(e.target.checked)
                      record('表示', `日影 ${e.target.checked ? '入' : '切'}`)
                    }}
                  />{' '}
                  日影（P2 の 3D の地面）
                </label>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={showNeighbors}
                    onChange={(e) => {
                      useUi.getState().setShowNeighbors(e.target.checked)
                      record('表示', `周辺建物 ${e.target.checked ? '入' : '切'}`)
                    }}
                  />{' '}
                  周辺建物（P1 の地図と P2 の 3D）
                </label>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={showDimensions}
                    onChange={(e) => {
                      useUi.getState().setShowDimensions(e.target.checked)
                      record('表示', `寸法線 ${e.target.checked ? '入' : '切'}`)
                    }}
                  />{' '}
                  寸法線（P3 の平面）
                </label>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => {
                      useUi.getState().setShowGrid(e.target.checked)
                      record('表示', `グリッド ${e.target.checked ? '入' : '切'}`)
                    }}
                  />{' '}
                  グリッド（P3 の平面）
                </label>
                <p style={{ fontSize: 11, color: '#666' }}>
                  全体図（右下の縮図）は、画面をまたぐ敷地の範囲を持っていないため、まだ出していない。
                </p>
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
