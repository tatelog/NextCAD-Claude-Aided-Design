// 画面の切り替え（D-04 共通ヘッダーの流れ P1〜P4、出力 P5）と、共通ヘッダーの右側（保存・モード・作業履歴・メニュー・保留）。
// 決まっていない値は各画面に「未決」と明記し、推測で埋めない。
import { useEffect, useRef, useState } from 'react'
import { P03Volume } from './ui/P03Volume'
import { P1Site } from './ui/P1Site'
import { P3Plan } from './ui/P3Plan'
import { P4Estimate } from './ui/P4Estimate'
import { P5Output } from './ui/P5Output'
import { useDrawing } from './store/drawing'
import { HeaderIconButton } from './ui/HeaderIconButton'
import { IconHistory, IconJudge, IconLoad, IconMenu, IconSave } from './ui/headerIcons'
import { PendingIndicator, SaveDot } from './ui/HeaderStatus'
import { targetSegmentsOf } from './plan/semanticConfirm'
import { useFixtures } from './store/fixtures'
import { useFirstFloor } from './store/firstFloor'
import { useConfirmedSite } from './store/confirmedSite'
import { workLogToCsv } from './app/workLogCsv'
import { devSeedSquareStrokes } from './app/devSeed'
import { buildSaveData } from './app/saveData'
import { applyLoadedProject, parseSaveData } from './app/loadData'
import { usePending } from './store/pending'
import { FEATURE_ITEMS, featureShown, setFeatureOn, useFeatures } from './store/features'
import { useActiveMode, useMode, type WorkMode } from './store/mode'
import { hidesTilesOf, modeName, SCREEN_MODES } from './app/screenModes'
import { PANEL_TILES, usePanelTiles } from './store/panelTiles'
import { MenuCheckRows } from './ui/MenuCheckRows'
import { ModeSwitch } from './ui/ModeSwitch'
import { featureMenuGroupsOf, panelMenuGroupsOf } from './ui/menuGroups'
import { Fold } from './ui/Fold'
import { openWorkLog, recentWorkLog, recordWorkLog, snapshotOfWorkLogRow } from './app/workLogStore'
import { startLineLog } from './app/workLogLines'
import { restoreSnapshotJson } from './app/workSnapshot'
import { judgeSegments, judgeText } from './worker/judge'
import { appWorkerUrl } from './worker/workerUrl'
import { useChat } from './store/chat'
import { useSelection } from './store/selection'
import { chatTransportOf, contextInputOf } from './chat/chatTransport'
import { CHAT_MODEL_DEFAULT } from './chat/chatRequest'
import { pendingLogEntry } from './app/pendingJudgments'
import { saveStatusOf, type SaveSnapshotState } from './app/saveStatus'
import { useSemantic } from './store/semantic'
import { FIXED_LOCKED, LAYER_NAMES } from './plan/layers'
import { useLayers } from './store/layers'
import { useUndoKeys } from './ui/useUndoKeys'
import { SCREENS, type ScreenId } from './app/screenTabs'
import { creditRowsOf } from './data/sources'
import { useDevTools } from './store/devTools'

const button = { font: 'inherit', padding: '4px 10px', border: '1px solid #b8b2a4', borderRadius: 6, background: '#fff', color: '#1f2a44', cursor: 'pointer', whiteSpace: 'nowrap' } as const

// 判定の Worker の URL（B: 配備したアプリは同じ場所。手元の開発は VITE_WORKER_URL を置いた場合だけ送る）
const WORKER_URL: string = appWorkerUrl()

export function App() {
  // 画面の Ctrl+Z・Ctrl+Y で、図面の Undo・Redo（G68）
  useUndoKeys()
  const [screen, setScreen] = useState<ScreenId>('P1')
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
  const featureOn = useFeatures((s) => s.on)
  // 作業のモード（G95・G100・G101）: System・Chat・Drawing。切替は、この画面で使えるものだけ出す
  const activeMode = useActiveMode(screen)
  // 右パネルの閉じたタイル（G73・G74）。メニューの「右パネルの項目」で戻す
  const panelHidden = usePanelTiles((s) => s.hidden)
  // 今のモードで隠す画面の項目（G127。Drawing の意味づけの確認）。一覧の印を閉じた印にする
  const modeHiddenTiles = hidesTilesOf(SCREEN_MODES, activeMode)
  // レイヤーの表示とロック（G66）。筆界はロック固定
  const layerVisible = useLayers((s) => s.visible)
  const layerLocked = useLayers((s) => s.locked)
  // 保存状態（保存した時点の案件と、いまの案件を店舗の参照で比べる。ハブ D-04 共通ヘッダー）
  const drawEntries = useDrawing((s) => s.entries)
  const drawStoreys = useDrawing((s) => s.storeyCount)
  const drawHeight = useDrawing((s) => s.storeyHeightMm)
  const drawFixtures = useFixtures((s) => s.fixtures)
  const snapshotNow = (): SaveSnapshotState => {
    const d = useDrawing.getState()
    return { entries: d.entries, storeyCount: d.storeyCount, storeyHeightMm: d.storeyHeightMm, fixtures: useFixtures.getState().fixtures }
  }
  const [saved, setSaved] = useState<SaveSnapshotState>(snapshotNow)
  const saveStatus = saveStatusOf(saved, { entries: drawEntries, storeyCount: drawStoreys, storeyHeightMm: drawHeight, fixtures: drawFixtures })
  const record = (action: string, target: string) => {
    recordWorkLog({ at: new Date().toISOString(), screen, action, target })
    setRev((r) => r + 1)
  }

  const go = (id: ScreenId) => {
    setScreen(id)
    recordWorkLog({ at: new Date().toISOString(), screen: id, action: '切替', target: id })
    setRev((r) => r + 1)
  }

  // 意味づけの判定（Claude）。F5・F9 の線を Worker に送り、結果は要確認の提案として入れる。失敗は保留へ（G9・G14・G31）
  const [judgeMessage, setJudgeMessage] = useState<string | null>(null)
  const judgeNow = async () => {
    // Claude が見るのは F5・F9 の線だけ（G9）。P2 の線と P3 で描いた線（F9）が入る
    const segments = targetSegmentsOf(useDrawing.getState().entries).map((s) => ({ id: s.id, a: { x: s.x1, y: s.y1 }, b: { x: s.x2, y: s.y2 } }))
    const outcome = await judgeSegments(
      { segments, workerUrl: WORKER_URL, enabled: useFeatures.getState().on.classifyClaude, fetchImpl: (url, init) => fetch(url, init) },
      {
        suggest: (id, kind, confidence) => useSemantic.getState().suggest(id, kind, confidence),
        addPending: (error) => {
          const at = new Date().toISOString()
          usePending.getState().add({ id: `judge-${Date.now()}`, label: '意味づけの判定', error, at })
          // 保留の保存先は作業ログ（G31・G32）
          recordWorkLog(pendingLogEntry(error, at))
        },
      },
    )
    setJudgeMessage(judgeText(outcome))
  }

  // 作業履歴の行の時点に戻す（線・階数・階高・什器。案件名は今のまま）。戻したことも行に残る
  const restoreRow = (id: number) => {
    const json = snapshotOfWorkLogRow(id)
    if (json === null) return
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
    setSaved(snapshotNow())
  }

  // 読み込み（保存した JSON を選ぶ）。一覧・階数・階高・什器・案件名を戻す。意味づけは保存していないので、読んだあとは空に戻す
  const fileInput = useRef<HTMLInputElement>(null)
  const [loadMessage, setLoadMessage] = useState<string | null>(null)
  const load = async (file: File) => {
    try {
      const p = parseSaveData(JSON.parse(await file.text()))
      applyLoadedProject(p)
      setProject(p.projectName)
      setSaved(snapshotNow())
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
      <nav aria-label="画面切り替え" style={{ display: 'flex', flexShrink: 0, gap: 6, marginLeft: 24, whiteSpace: 'nowrap' }}>
        {SCREENS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={screen === s.id ? 'is-active' : undefined}
            aria-pressed={screen === s.id}
            onClick={() => go(s.id)}
            style={{ ...button, background: screen === s.id ? '#1f2a44' : '#fff', color: screen === s.id ? '#fff' : '#1f2a44' }}
          >
            {s.name}
          </button>
        ))}
      </nav>
        <span style={{ flex: 1 }} />
        <HeaderIconButton
          label="意味づけを判定"
          icon={<IconJudge />}
          onClick={judgeNow}
          disabled={!featureOn.classifyClaude}
          title={WORKER_URL ? '意味づけを判定' : '意味づけを判定（判定の接続先が未設定です。押すと、その旨を出します）'}
        />
        {judgeMessage ? <span style={{ fontSize: 11, color: '#5b6670', maxWidth: 260 }}>{judgeMessage}</span> : null}
        <PendingIndicator count={pendingCount} />
        <HeaderIconButton label="読み込み" icon={<IconLoad />} onClick={() => fileInput.current?.click()} />
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
        <SaveDot status={saveStatus} />
        <HeaderIconButton label="保存" icon={<IconSave />} onClick={save} />
        <ModeSwitch
          screen={screen}
          activeMode={activeMode}
          onPick={(id) => {
            useMode.getState().setMode(id as WorkMode)
            record('モード', modeName(SCREEN_MODES, id))
          }}
        />
        <HeaderIconButton label="作業履歴" icon={<IconHistory />} pressed={panel === 'log'} onClick={() => setPanel(panel === 'log' ? null : 'log')} />
        {/* メニュー（ハブ A-03 G74）: ☰（三本線） */}
        <HeaderIconButton label="メニュー" icon={<IconMenu />} pressed={panel === 'menu'} onClick={() => setPanel(panel === 'menu' ? null : 'menu')} />
      </header>

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {screen === 'P1' && <P1Site onNext={() => go('P2')} />}
        {screen === 'P2' && <P03Volume onNext={() => go('P3')} />}
        {screen === 'P3' && <P3Plan onNext={() => go('P4')} />}
        {screen === 'P4' && <P4Estimate onNext={() => go('P5')} />}
        {screen === 'P5' && <P5Output />}
        {panel !== null && (
          <aside ref={menuRef} aria-label={panel === 'menu' ? 'メニュー' : '作業履歴'} style={{ position: 'absolute', ...(panel === 'menu' ? { top: 8, right: 8, width: 380, maxWidth: 'calc(100% - 16px)', maxHeight: 'calc(100% - 16px)', boxSizing: 'border-box', border: '1px solid #ddd8cc', borderRadius: 10, boxShadow: '0 8px 28px #1f2a4433', overflowWrap: 'anywhere' } : { top: 0, right: 0, bottom: 0, width: 320, borderLeft: '1px solid #ddd8cc' }), background: '#fff', padding: 12, overflowY: 'auto', zIndex: 5 }}>
            {panel === 'menu' && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <strong>メニュー</strong>
              <button type="button" aria-label="メニューを閉じる" style={button} onClick={() => setPanel(null)}>閉じる</button>
            </div>}
            {panel === 'log' && (
              <>
                <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>作業履歴（同じブラウザに残る）</h2>
                <p style={{ fontSize: 11, color: '#666' }}>SQLite（sql.js）の表から新しい順に読む。この同じブラウザの中に保存する。</p>
                <button
                  type="button"
                  style={{ ...button, marginBottom: 8 }}
                  disabled={!logReady}
                  onClick={() => {
                    // 作業履歴を CSV で書き出す（ハブ A-03 G68）。画面の一覧と同じ 200 件
                    const url = URL.createObjectURL(new Blob([workLogToCsv(recentWorkLog(200))], { type: 'text/csv;charset=utf-8' }))
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'work-log.csv'
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  CSV で書き出す
                </button>
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
                <Fold title="クレジット（出典）">
                  {creditRowsOf().map((r) => (
                    <p key={r.key} style={{ margin: '0 0 6px', fontSize: 12 }}>
                      {r.name}：{r.text}
                    </p>
                  ))}
                </Fold>
                <label style={{ display: 'block', margin: '0 0 8px', fontSize: 12 }}>
                  <input type="checkbox" checked={devShown} onChange={(e) => setDevShown(e.target.checked)} /> 開発用の道具を出す（経緯度・ズーム・区のコード・CityGML・数値入力・回転・機能の調整の欄）
                </label>
                <Fold title="機能一覧（チェックで入・切）">
                  <MenuCheckRows
                    groups={featureMenuGroupsOf(featureShown)}
                    onToggle={(id, shown) => {
                      const f = FEATURE_ITEMS.find((i) => i.key === id)
                      if (!f) return
                      setFeatureOn(f.key, shown)
                      record(f.group === '表示' ? '表示' : '機能', `${f.label} ${shown ? '入' : '切'}`)
                    }}
                  />
                </Fold>
                <Fold title="レイヤー（表示とロック。筆界はロック固定）">
                  {LAYER_NAMES.map((name) => (
                    <div key={name} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, marginBottom: 2 }}>
                      <span style={{ width: 90 }}>{name}</span>
                      <label>
                        <input
                          type="checkbox"
                          checked={layerVisible[name]}
                          onChange={(e) => {
                            useLayers.getState().setVisible(name, e.target.checked)
                            record('レイヤー', `${name} 表示 ${e.target.checked ? '入' : '切'}`)
                          }}
                        />{' '}
                        表示
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={layerLocked[name]}
                          disabled={FIXED_LOCKED.includes(name)}
                          onChange={(e) => {
                            useLayers.getState().setLocked(name, e.target.checked)
                            record('レイヤー', `${name} ロック ${e.target.checked ? '入' : '切'}`)
                          }}
                        />{' '}
                        ロック
                      </label>
                    </div>
                  ))}
                </Fold>
                <Fold title="右パネルの項目（ボリュームの機能一覧。チェックで右パネルに出す）">
                  <MenuCheckRows
                    groups={panelMenuGroupsOf(panelHidden, PANEL_TILES, modeHiddenTiles)}
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
                  全体図は、ボリュームと平面の描く物の範囲を映す。敷地の地図の上には出していない。
                </p>
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
