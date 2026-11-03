// 画面の切り替え（D-04 共通ヘッダーの流れ P1〜P4、出力 P5）と、共通ヘッダーの右側（保存・作業履歴・メニュー・保留）。
// 決まっていない値は各画面に「未決」と明記し、推測で埋めない。
import { useEffect, useRef, useState } from 'react'
import { P03Volume } from './ui/P03Volume'
import { P1Site } from './ui/P1Site'
import { P3Plan } from './ui/P3Plan'
import { P4Estimate } from './ui/P4Estimate'
import { P5Output } from './ui/P5Output'
import { useDrawing } from './store/drawing'
import { useFixtures } from './store/fixtures'
import { useUi } from './store/ui'
import { p3Stroke } from './plan/p3Stroke'
import { buildSaveData } from './app/saveData'
import { applyLoadedProject, parseSaveData } from './app/loadData'
import { usePending } from './store/pending'
import { FEATURE_ITEMS, featureUiPatch, useFeatures, type FeatureKey } from './store/features'
import { PANEL_TILES, usePanelTiles } from './store/panelTiles'
import { Fold } from './ui/Fold'
import { downloadJsonFromDrive, listProjectFiles, type DriveProjectFile } from './drive/driveDownload'
import { DRIVE_CLIENT_ID, requestDriveToken } from './drive/gis'
import { uploadJsonToDrive } from './drive/driveUpload'
import { openWorkLog, recentWorkLog, recordWorkLog, snapshotOfWorkLogRow } from './app/workLogStore'
import { startLineLog } from './app/workLogLines'
import { restoreSnapshotJson } from './app/workSnapshot'
import { judgeSegments, judgeText } from './worker/judge'
import { workerUrlFor } from './worker/workerUrl'
import { pendingLogEntry } from './app/pendingJudgments'
import { saveStatusOf, type SaveSnapshotState } from './app/saveStatus'
import { useSemantic } from './store/semantic'
import { FIXED_LOCKED, LAYER_NAMES } from './plan/layers'
import { useLayers } from './store/layers'

const SCREENS = [
  { id: 'P1', name: '敷地' },
  { id: 'P2', name: 'ボリューム' },
  { id: 'P3', name: '平面' },
  { id: 'P4', name: '積算' },
  { id: 'P5', name: '出力' },
] as const

type ScreenId = (typeof SCREENS)[number]['id']

const button = { font: 'inherit', padding: '4px 10px', border: '1px solid #b8b2a4', borderRadius: 6, background: '#fff', color: '#1f2a44', cursor: 'pointer', whiteSpace: 'nowrap' } as const

// 判定の Worker の URL（B: 配備したアプリは同じ場所。手元の開発は VITE_WORKER_URL を置いた場合だけ送る）
const WORKER_URL: string = workerUrlFor({ configured: import.meta.env.VITE_WORKER_URL, origin: window.location.origin, prod: import.meta.env.PROD })

export function App() {
  const [screen, setScreen] = useState<ScreenId>('P2')
  // 案件名（敷地名）。画面の中だけで持つ（保存のときだけ書き出す）
  const [project, setProject] = useState('')
  // 開発用: ?seed=square で、20 m × 30 m の閉じた外形を描いた状態から始める（画面の確認用。本番ビルドには入らない）
  useEffect(() => {
    if (!import.meta.env.DEV) return
    if (new URLSearchParams(window.location.search).get('seed') !== 'square') return
    const corners = [
      [0, 0],
      [2000, 0],
      [2000, 3000],
      [0, 3000],
      [0, 0],
    ]
    useDrawing.getState().clear()
    for (let i = 0; i < 4; i++) {
      const [a, b] = [corners[i]!, corners[i + 1]!]
      useDrawing.getState().addStroke(
        p3Stroke({ points: [{ px: a[0]!, py: a[1]! }, { px: b[0]!, py: b[1]! }], viewScaleMmPerPx: 10, viewOriginPx: { px: 0, py: 0 }, id: `seed-${i}` }),
      )
    }
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
  const [panel, setPanel] = useState<'log' | 'menu' | null>(null)
  const showShadow = useUi((s) => s.showShadow)
  const showNeighbors = useUi((s) => s.showNeighbors)
  const showDimensions = useUi((s) => s.showDimensions)
  const showGrid = useUi((s) => s.showGrid)
  const showMiniMap = useUi((s) => s.showMiniMap)
  // 保留の一覧の件数（G31）。判定の接続はまだなので、今は 0 のまま
  const pendingCount = usePending((s) => s.items.length)
  // 機能のオンオフ（G70）。設定を持ち、つながっている項目は画面の状態にも出す
  const featureOn = useFeatures((s) => s.on)
  // 右パネルの閉じたタイル（G73・G74）。メニューの「右パネルの項目」で戻す
  const panelHidden = usePanelTiles((s) => s.hidden)
  // 入力スナップは、ツールバーのボタンと同じ状態を読む（二つの欄が食い違わないように）
  const inputSnapGrid = useUi((s) => s.inputSnapGrid)
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
  const setFeature = (key: FeatureKey, on: boolean) => {
    useFeatures.getState().setOn(key, on)
    const patch = featureUiPatch(key, on)
    if (patch) useUi.setState(patch)
  }

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
    const segments = useDrawing
      .getState()
      .entries.flatMap((e) => e.segments)
      .filter((s) => s.stage === 'F5' || s.stage === 'F9')
      .map((s) => ({ id: s.id, a: { x: s.x1, y: s.y1 }, b: { x: s.x2, y: s.y2 } }))
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

  // 案件の中身（保存と Drive 保存で同じ）
  const projectData = () => {
    const d = useDrawing.getState()
    return buildSaveData({
      projectName: project,
      entries: d.entries,
      storeyCount: d.storeyCount,
      storeyHeightMm: d.storeyHeightMm,
      fixtures: useFixtures.getState().fixtures,
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

  // Drive から開く: 一覧を出し（アプリが作ったファイルだけ）、選んだものを読む。トークンは画面の中だけに持つ（保存しない）
  const [driveToken, setDriveToken] = useState<string | null>(null)
  const [driveFiles, setDriveFiles] = useState<DriveProjectFile[]>([])
  const [driveFileId, setDriveFileId] = useState('')
  const listDrive = async () => {
    if (!DRIVE_CLIENT_ID) return
    try {
      const token = await requestDriveToken(DRIVE_CLIENT_ID)
      const files = await listProjectFiles({ token })
      setDriveToken(token)
      setDriveFiles(files)
      setDriveFileId(files[0]?.id ?? '')
      setLoadMessage(files.length === 0 ? 'Drive に案件のファイルがありません' : `Drive に ${files.length} 件あります`)
    } catch (e) {
      setLoadMessage(`Drive の一覧を取れませんでした: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  const openDrive = async () => {
    if (!DRIVE_CLIENT_ID || !driveFileId) return
    try {
      const token = driveToken ?? (await requestDriveToken(DRIVE_CLIENT_ID))
      const p = parseSaveData(await downloadJsonFromDrive({ token, id: driveFileId }))
      applyLoadedProject(p)
      setProject(p.projectName)
      setSaved(snapshotNow())
      setLoadMessage(`Drive から「${p.projectName}」を読み込みました`)
      record('Drive 読み込み', p.projectName)
    } catch (e) {
      setLoadMessage(`Drive から読めませんでした: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // Google Drive への保存（アプリのクライアント ID。drive.file。今回は接続まで。保存先は Drive の直下）
  const [driveMessage, setDriveMessage] = useState<string | null>(null)
  const saveToDrive = async () => {
    if (!DRIVE_CLIENT_ID) return
    setDriveMessage('Google の認証を開いています…')
    try {
      const data = projectData()
      const token = await requestDriveToken(DRIVE_CLIENT_ID)
      const id = await uploadJsonToDrive({ token, name: `${data.projectName}.json`, json: JSON.stringify(data, null, 2) })
      setDriveMessage(`Drive に保存しました（ファイル ID: ${id}）`)
      record('Drive 保存', data.projectName)
      setSaved(snapshotNow())
    } catch (e) {
      setDriveMessage(e instanceof Error ? e.message : String(e))
    }
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
        <button
          type="button"
          style={button}
          onClick={judgeNow}
          disabled={!WORKER_URL || !featureOn.classifyClaude}
          title={WORKER_URL ? 'F5・F9 の線を Claude の判定へ送る（結果は要確認の提案）' : 'VITE_WORKER_URL が未設定のため送れない'}
        >
          意味づけを判定
        </button>
        {judgeMessage ? <span style={{ fontSize: 11, color: '#5b6670', maxWidth: 260 }}>{judgeMessage}</span> : null}
        <span title="Claude の判定で、再試行しても失敗したもの（保留の一覧）" style={{ fontSize: 12, color: '#5b6670' }}>
          保留 {pendingCount}
        </span>
        <button type="button" style={button} onClick={() => fileInput.current?.click()}>
          読み込み
        </button>
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
        <button
          type="button"
          style={button}
          onClick={listDrive}
          disabled={!DRIVE_CLIENT_ID}
          title={DRIVE_CLIENT_ID ? 'Drive に上げた案件の一覧を出す（アプリが作ったファイルだけ）' : 'VITE_GOOGLE_CLIENT_ID が未設定のため使えない'}
        >
          Drive から開く
        </button>
        {driveFiles.length > 0 ? (
          <>
            <select aria-label="Drive の案件" value={driveFileId} onChange={(e) => setDriveFileId(e.target.value)} style={{ font: 'inherit', maxWidth: 200 }}>
              {driveFiles.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <button type="button" style={button} onClick={openDrive}>
              この案件を開く
            </button>
          </>
        ) : null}
        {loadMessage ? <span style={{ fontSize: 11, color: '#5b6670', maxWidth: 260 }}>{loadMessage}</span> : null}
        <span style={{ fontSize: 11, color: saveStatus === '保存済み' ? '#5b6670' : '#a86b00' }}>{saveStatus}</span>
        <button type="button" style={button} onClick={save}>
          保存
        </button>
        <button
          type="button"
          style={button}
          onClick={saveToDrive}
          disabled={!DRIVE_CLIENT_ID}
          title={DRIVE_CLIENT_ID ? 'Google ドライブに案件を保存（アプリのクライアント ID）' : 'VITE_GOOGLE_CLIENT_ID が未設定のため使えない'}
        >
          Drive に保存
        </button>
        {driveMessage ? <span style={{ fontSize: 11, color: '#5b6670', maxWidth: 260 }}>{driveMessage}</span> : null}
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
          <aside style={{ position: 'absolute', top: 0, right: 0, bottom: 0, ...(panel === 'menu' ? { left: 0 } : { width: 320 }), background: '#fff', borderLeft: '1px solid #ddd8cc', padding: 12, overflowY: 'auto', zIndex: 5 }}>
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
                <Fold title="表示（機能のオンオフ）">
                <label style={{ display: 'block', marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={showShadow}
                    onChange={(e) => {
                      setFeature('showShadow', e.target.checked)
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
                      setFeature('showNeighbors', e.target.checked)
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
                      setFeature('showDimensions', e.target.checked)
                      record('表示', `寸法線 ${e.target.checked ? '入' : '切'}`)
                    }}
                  />{' '}
                  寸法線（P3 の平面）
                </label>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={showMiniMap}
                    onChange={(e) => {
                      setFeature('showMiniMap', e.target.checked)
                      record('表示', `全体図 ${e.target.checked ? '入' : '切'}`)
                    }}
                  />{' '}
                  全体図（右下の縮図：P2・P3）
                </label>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => {
                      setFeature('showGrid', e.target.checked)
                      record('表示', `グリッド ${e.target.checked ? '入' : '切'}`)
                    }}
                  />{' '}
                  グリッド（P3 の平面）
                </label>
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
                <Fold title="右パネルの項目（閉じたものを戻す。G73・G74）">
                  {PANEL_TILES.map((t) => (
                    <label key={t.id} style={{ display: 'block', marginBottom: 6 }}>
                      <input
                        type="checkbox"
                        checked={!panelHidden[t.id]}
                        onChange={(e) => {
                          if (e.target.checked) usePanelTiles.getState().showTile(t.id)
                          else usePanelTiles.getState().hideTile(t.id)
                          record('右パネル', `${t.title} ${e.target.checked ? '入' : '切'}`)
                        }}
                      />{' '}
                      {t.title}
                    </label>
                  ))}
                </Fold>
                <Fold title="機能のオンオフ（案。項目の中身は未決）">
                  {FEATURE_ITEMS.filter((f) => f.group !== '表示').map((f) => (
                    <label key={f.key} style={{ display: 'block', marginBottom: 6 }}>
                      <input type="checkbox" checked={f.key === 'inputSnap' ? inputSnapGrid : featureOn[f.key]} onChange={(e) => {
                        setFeature(f.key, e.target.checked)
                        record('機能', `${f.label} ${e.target.checked ? '入' : '切'}`)
                      }} />{' '}
                      {f.label}
                      {f.connected ? null : <span style={{ color: '#a86b00', fontSize: 11 }}>（未接続）</span>}
                    </label>
                  ))}
                </Fold>
                <p style={{ fontSize: 11, color: '#666' }}>
                  全体図は、P2 と P3 の描く物の範囲を映す。P1 の地図の上には出していない（地図の範囲と合わせる規則が未決）。
                </p>
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
