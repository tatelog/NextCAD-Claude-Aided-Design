import {useBimSettings} from './store/bimSettings'
import {useFloorPlans} from './store/floorPlans'
import {useSpecSelections} from './store/specSelections'
import {useTutorial} from './tutorial/state'
import {Tutorial} from './tutorial/Tutorial'
import {usePlanZoom} from './store/planZoom'
// 画面の切り替え（D-04 共通ヘッダーの流れ P1〜P4、出力 P5）と、共通ヘッダーの右側（保存・モード・作業履歴・メニュー・保留）。
// 決まっていない値は各画面に「未決」と明記し、推測で埋めない。
import { useEffect, useRef, useState } from 'react'
import { P03Volume } from './ui/P03Volume'
import { P1Site } from './ui/P1Site'
import { P3Plan } from './ui/P3Plan'
import { P4Estimate } from './ui/P4Estimate'
import { P5Output } from './ui/P5Output'
import { useDrawing } from './store/drawing'
import { ToolIcon } from './ui/toolIcons'
import { HeaderIconButton } from './ui/HeaderIconButton'
import { IconHistory, IconLoad, IconMenu, IconSave } from './ui/headerIcons'
import { PendingIndicator } from './ui/HeaderStatus'
import { useFixtures } from './store/fixtures'
import { useFirstFloor } from './store/firstFloor'
import { useConfirmedSite } from './store/confirmedSite'
import { devSeedSquareStrokes } from './app/devSeed'
import { buildSaveData } from './app/saveData'
import { applyLoadedProject, parseSaveData } from './app/loadData'
import { usePending } from './store/pending'
import { useFeatures } from './store/features'
import { useActiveMode, useMode, type WorkMode } from './store/mode'
import { hidesTilesOf, modeName, SCREEN_MODES } from './app/screenModes'
import { PANEL_TILES, usePanelTiles } from './store/panelTiles'
import { MenuCheckRows } from './ui/MenuCheckRows'
import { ModeSwitch } from './ui/ModeSwitch'
import { panelMenuGroupsOf } from './ui/menuGroups'
import { Fold } from './ui/Fold'
import { openWorkLog, recentWorkLog, recordWorkLog, snapshotOfWorkLogRow } from './app/workLogStore'
import { startLineLog } from './app/workLogLines'
import { restoreSnapshotJson } from './app/workSnapshot'
import { appWorkerUrl } from './worker/workerUrl'
import { useChat } from './store/chat'
import { useSelection } from './store/selection'
import { chatTransportOf, contextInputOf } from './chat/chatTransport'
import { CHAT_MODEL_DEFAULT } from './chat/chatRequest'
import { useSemantic } from './store/semantic'
import { useUndoKeys } from './ui/useUndoKeys'
import { ALL_REACHED, lockReasonOf, reachedAfterNext, SCREENS, screenOpen, type ScreenId } from './app/screenTabs'
import { creditRowsOf } from './data/sources'
import { useDevTools } from './store/devTools'

const button = { font: 'inherit', padding: '4px 10px', border: '1px solid #b8b2a4', borderRadius: 6, background: '#fff', color: '#1f2a44', cursor: 'pointer', whiteSpace: 'nowrap' } as const

// 判定の Worker の URL（B: 配備したアプリは同じ場所。手元の開発は VITE_WORKER_URL を置いた場合だけ送る）
const WORKER_URL: string = appWorkerUrl()

export function App() {
  const canUndo = useDrawing((s) => s.past.length > 0)
  const canRedo = useDrawing((s) => s.redoStack.length > 0)
  // 画面の Ctrl+Z・Ctrl+Y で、図面の Undo・Redo（G68）
  useUndoKeys()
  const planZoom = usePlanZoom(s=>s.zoom)
  const setPlanZoom = usePlanZoom(s=>s.setZoom)
  const tutorialActive=useTutorial(s=>s.active)
  const [screen, setScreen] = useState<ScreenId>('P1')
  // 画面の順番（代表の決定 2026-11-08）: 「次へ」を押した画面まで開ける。先の画面へ一足飛びに移れない
  const [reached, setReached] = useState(0)
  // 開発用の道具（☰ の切替。既定は隠す）
  const devShown = useDevTools((s) => s.shown)
  const setDevShown = useDevTools((s) => s.setShown)
  // 案件名（敷地名）。画面の中だけで持つ（保存のときだけ書き出す）
  const [project, setProject] = useState('')
  // 開発用: ?seed=square で、20 m × 30 m の閉じた外形を描いた状態から始める（画面の確認用。本番ビルドには入らない）
  useEffect(() => {
    if (!import.meta.env.DEV) return
    if (new URLSearchParams(window.location.search).get('seed') !== 'square') return
    // 外形はダミーの筆界と同じ範囲（devSeed.ts。統括の依頼 2026-11-06）
    useDrawing.getState().clear()
    for (const s of devSeedSquareStrokes()) useDrawing.getState().addStroke(s)
  }, [])

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
  // 線が変わるたびに、作業履歴の行を状態つきで書く（G68。戻せるように）
  useEffect(() => startLineLog(), [])
  // チャットの返信（t55）: Worker の URL があり、意味づけがオンのときだけ Worker の /chat につなぐ。無ければ未接続のまま（図面は変わらない）
  const chatOn = useFeatures((s) => s.on.classifyClaude)
  useEffect(() => {
    if (!WORKER_URL || !chatOn) {
      useChat.getState().setTransport(null)
      return
    }
    useChat.getState().setTransport(
      chatTransportOf({
        workerUrl: WORKER_URL,
        model: CHAT_MODEL_DEFAULT,
        fetchImpl: (url, init) => fetch(url, init),
        contextOf: () =>
          contextInputOf({
            screen,
            mode: useMode.getState().mode,
            rows: recentWorkLog(200),
            entries: useDrawing.getState().entries,
            assignments: useSemantic.getState().assignments,
            selectedSegmentIds: useSelection.getState().segmentIds,
          }),
      }),
    )
  }, [chatOn, screen])
  const [panel, setPanel] = useState<'log' | 'menu' | null>(null)
  const menuRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (panel !== 'menu') return
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Element
      if (!menuRef.current?.contains(target) && !target.closest('button[aria-label="メニュー"]')) setPanel(null)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPanel(null)
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', escape)
    }
  }, [panel])
  // 保留の一覧の件数（G31）。判定の接続はまだなので、今は 0 のまま
  const pendingCount = usePending((s) => s.items.length)
  // 機能のオンオフ（G70）。設定を持ち、つながっている項目は画面の状態にも出す
  // 作業のモード（G95・G100・G101）: System・Chat・Drawing。切替は、この画面で使えるものだけ出す
  const activeMode = useActiveMode(screen)
  // 右パネルの閉じたタイル（G73・G74）。メニューの「右パネルの項目」で戻す
  const panelHidden = usePanelTiles((s) => s.hidden)
  // 今のモードで隠す画面の項目（G127。Drawing の意味づけの確認）。一覧の印を閉じた印にする
  const modeHiddenTiles = hidesTilesOf(SCREEN_MODES, activeMode)
  // レイヤーの表示とロック（G66）。筆界はロック固定
  const record = (action: string, target: string) => {
    recordWorkLog({ at: new Date().toISOString(), screen, action, target })
    setRev((r) => r + 1)
  }

  const go = (id: ScreenId) => {
    setScreen(id)
    recordWorkLog({ at: new Date().toISOString(), screen: id, action: '切替', target: id })
    setRev((r) => r + 1)
  }

  // 「次へ」: 次の画面まで開けてから移る
  const next = (id: ScreenId) => {
    setReached((r) => reachedAfterNext(r, id))
    go(id)
  }

  // 作業履歴の行の時点に戻す（線・階数・階高・什器。案件名は今のまま）。戻したことも行に残る
  const restoreRow = (id: number) => {
    const json = snapshotOfWorkLogRow(id)
    if (json === null) return
    if (!window.confirm('本当にこの時点に戻しますか？\n復元後は、Redo（やり直す）で復元前の状態には戻れません。')) return
    try {
      restoreSnapshotJson(json, project)
      record('履歴', `#${id} の時点に戻す`)
    } catch (e) {
      setLoadMessage(`戻せませんでした: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // 案件の中身（保存と同じ）
  const projectData = () => {
    const d = useDrawing.getState()
    return buildSaveData({
      bimSettings:useBimSettings.getState().settings,
      specSelections:useSpecSelections.getState().selections,
      floorPlans:useFloorPlans.getState().plans,
      floorPlanSource:useFloorPlans.getState().source,
      projectName: project,
      entries: d.entries,
      storeyCount: d.storeyCount,
      storeyHeightMm: d.storeyHeightMm,
      fixtures: useFixtures.getState().fixtures,
      unitPriceTexts: useFixtures.getState().unitPriceTexts,
      firstFloorNames: useFirstFloor.getState().names,
      // 確定した敷地（統括の依頼 2026-11-06。8）
      confirmedSite: useConfirmedSite.getState().confirmed,
      savedAt: new Date(),
    })
  }

  const save = () => {
    const data = projectData()
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.projectName}.json`
    a.click()
    URL.revokeObjectURL(url)
    record('保存', data.projectName)
  }

  // 読み込み（保存した JSON を選ぶ）。一覧・階数・階高・什器・案件名を戻す。意味づけは保存していないので、読んだあとは空に戻す
  const fileInput = useRef<HTMLInputElement>(null)
  const [loadMessage, setLoadMessage] = useState<string | null>(null)
  const load = async (file: File) => {
    try {
      const p = parseSaveData(JSON.parse(await file.text()))
      applyLoadedProject(p)
      setReached(ALL_REACHED)
      setProject(p.projectName)
        setLoadMessage(`「${p.projectName}」を読み込みました`)
      record('読み込み', p.projectName)
    } catch (e) {
      setLoadMessage(`読み込めませんでした: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', background: '#fff', borderBottom: '1px solid #ddd8cc', flexShrink: 0, overflowX: 'auto' }}>
        <input
          aria-label="案件名（敷地名）"
          placeholder="敷地名（案件）"
          value={project}
          onChange={(e) => setProject(e.target.value)}
          style={{ font: 'inherit', fontWeight: 700, border: '1px solid transparent', padding: '2px 6px', width: 220, flex: '0 0 220px', boxSizing: 'border-box' }}
        />
        <span aria-hidden="true" style={{color:"#b4b7bd"}}>｜</span>
      <nav aria-label="画面切り替え" style={{ display: 'flex', flexShrink: 0, gap: 6, whiteSpace: 'nowrap' }}>
        {SCREENS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={screen === s.id ? 'is-active' : undefined}
            aria-pressed={screen === s.id}
            disabled={!screenOpen(s.id, reached)}
            title={lockReasonOf(s.id, reached) ?? undefined}
            onClick={() => go(s.id)}
            style={{ ...button, background: screen === s.id ? '#1f2a44' : '#fff', color: screen === s.id ? '#fff' : '#1f2a44', opacity: screenOpen(s.id, reached) ? 1 : 0.4, cursor: screenOpen(s.id, reached) ? 'pointer' : 'not-allowed' }}
          >
            {s.name}
          </button>
        ))}
      </nav>
        <button data-tutorial-exit type="button" className="hdr-btn" aria-label={tutorialActive?'チュートリアルを終了':'チュートリアル'} title={tutorialActive?'チュートリアルを終了':'チュートリアル'} aria-pressed={tutorialActive} onClick={()=>{if(tutorialActive){useTutorial.getState().setActive(false)}else{go('P1');window.dispatchEvent(new Event('tutorial-start'))}}}><svg aria-hidden="true" width="18" height="20" viewBox="0 0 24 28"><path d="M12 8 3.8 2.6Q2 1.5 2 3.8v14.5q0 1.3 1.1 2L12 26Z" fill="#c5ba85"/><path d="m12 8 8.2-5.4Q22 1.5 22 3.8v14.5q0 1.3-1.1 2L12 26Z" fill="#7c9b88"/><path d="M12 8 3.8 2.6Q2 1.5 2 3.8v14.5q0 1.3 1.1 2L12 26l8.9-5.7q1.1-.7 1.1-2V3.8q0-2.3-1.8-1.2Z" fill="none" stroke="#727d75" strokeWidth="1.2" strokeLinejoin="round"/></svg></button>
        <span aria-hidden="true" style={{color:"#b4b7bd", marginLeft:"auto", paddingLeft:24}}>｜</span>
        <span id="volume-display-controls" style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}} />
        <span aria-hidden="true" style={{color:"#b4b7bd"}}>｜</span>
        <HeaderIconButton label="元に戻す" title="元に戻す（描画・Ctrl+Z）" icon={<ToolIcon name="undo" />} disabled={!canUndo} onClick={() => useDrawing.getState().undo()} />
        <HeaderIconButton label="やり直す" title="やり直す（描画・Ctrl+Y）" icon={<ToolIcon name="redo" />} disabled={!canRedo} onClick={() => useDrawing.getState().redo()} />
        <span id="volume-clear-control" style={{display:"flex",flexShrink:0}} />
        {screen === 'P3' && <>
          <HeaderIconButton label="平面図を縮小" disabled={planZoom<=0.25} onClick={()=>setPlanZoom(z=>z/1.25)} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14"/></svg>} />
          <span aria-label="平面図の倍率" style={{fontSize:12,minWidth:40,textAlign:'center',whiteSpace:'nowrap'}}>{Math.round(planZoom*100)}%</span>
          <HeaderIconButton label="平面図を拡大" disabled={planZoom>=8} onClick={()=>setPlanZoom(z=>z*1.25)} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5v14"/></svg>} />
          <HeaderIconButton label="全体表示" onClick={()=>setPlanZoom(1)} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 4H4v5M15 4h5v5M4 15v5h5M20 15v5h-5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>} />
        </>}

        <span aria-hidden="true" style={{color:"#b4b7bd", flexShrink:0}}>｜</span>
        <ModeSwitch
          screen={screen}
          activeMode={activeMode}
          onPick={(id) => {
            useMode.getState().setMode(id as WorkMode)
            record('モード', modeName(SCREEN_MODES, id))
          }}
        />
        <span aria-hidden="true" style={{color:"#b4b7bd", flexShrink:0}}>｜</span>

        <PendingIndicator count={pendingCount} />
        <HeaderIconButton label="ファイルを開く" icon={<IconLoad />} onClick={() => fileInput.current?.click()} />
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          aria-label="保存した案件の JSON を選ぶ"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void load(file)
          }}
        />
        {loadMessage ? <span style={{ fontSize: 11, color: '#5b6670', maxWidth: 260 }}>{loadMessage}</span> : null}
        <HeaderIconButton label="保存" icon={<IconSave />} onClick={save} />

        <HeaderIconButton label="作業履歴" icon={<IconHistory />} pressed={panel === 'log'} onClick={() => setPanel(panel === 'log' ? null : 'log')} />
        {/* メニュー（ハブ A-03 G74）: ☰（三本線） */}
        <HeaderIconButton label="メニュー" icon={<IconMenu />} pressed={panel === 'menu'} onClick={() => setPanel(panel === 'menu' ? null : 'menu')} />
      </header>

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <Tutorial screen={screen} />
        {screen === 'P1' && <P1Site onNext={() => next('P2')} />}
        {screen === 'P2' && <P03Volume onNext={() => next('P3')} onSelectSite={() => go('P1')} />}
        {screen === 'P3' && <P3Plan onNext={() => next('P4')} />}
        {screen === 'P4' && <P4Estimate onNext={() => next('P5')} />}
        {screen === 'P5' && <P5Output projectName={project} />}
        {panel !== null && (
          <aside className={panel === 'menu' ? 'app-menu' : undefined} ref={menuRef} aria-label={panel === 'menu' ? 'メニュー' : '作業履歴'} style={{ position: 'absolute', ...(panel === 'menu' ? { top: 8, right: 8, width: 380, maxWidth: 'calc(100% - 16px)', maxHeight: 'calc(100% - 16px)', boxSizing: 'border-box', border: '1px solid #ddd8cc', borderRadius: 10, boxShadow: '0 8px 28px #1f2a4433', overflowWrap: 'anywhere' } : { top: 0, right: 0, bottom: 0, width: 320, borderLeft: '1px solid #ddd8cc' }), background: '#fff', padding: 12, overflowY: 'auto', zIndex: 5 }}>
            {panel === 'menu' && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <strong>メニュー</strong>
              <button type="button" aria-label="メニューを閉じる" style={button} onClick={() => setPanel(null)}>閉じる</button>
            </div>}
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
                      {l.hasSnapshot ? (
                        <button type="button" style={{ ...button, marginLeft: 6, padding: '0 6px', fontSize: 11 }} onClick={() => restoreRow(l.id)}>
                          この時点に戻す
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </>
            )}
            {panel === 'menu' && (
              <>
                <label style={{ display: 'block', margin: '0 0 8px', fontSize: 12 }}>
                  <input type="checkbox" checked={devShown} onChange={(e) => setDevShown(e.target.checked)} /> 開発用の道具を出す（経緯度・ズーム・区のコード・CityGML・数値入力・回転・機能の調整の欄）
                </label>
                <Fold title="右パネルの項目（ボリュームの機能一覧。チェックで右パネルに出す）">
                  <MenuCheckRows
                    groups={panelMenuGroupsOf(panelHidden, PANEL_TILES.filter((tile) => !['p2-volume', 'p2-numeric', 'p2-rotate'].includes(tile.id)), modeHiddenTiles)}
                    onToggle={(id, shown) => {
                      // 今のモードで隠す項目は、押しても変えない（押すと、モードを替えたときに閉じた状態が残るため。G127）
                      if (modeHiddenTiles.includes(id)) return
                      if (shown) usePanelTiles.getState().showTile(id)
                      else usePanelTiles.getState().hideTile(id)
                      record('右パネル', `${PANEL_TILES.find((t) => t.id === id)?.title ?? id} ${shown ? '入' : '切'}`)
                    }}
                  />
                </Fold>
                <p style={{ fontSize: 11, color: '#666' }}>
                  全体図は、敷地と描画した建物の位置関係を俯瞰できます。
                </p>
                <Fold title="クレジット（出典）" defaultOpen={false}>
                  {creditRowsOf().map((r) => (
                    <p key={r.key} style={{ margin: '0 0 6px', fontSize: 12 }}>
                      {r.name}：{r.text}
                    </p>
                  ))}
                </Fold>
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
