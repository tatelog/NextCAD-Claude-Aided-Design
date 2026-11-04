// P1 敷地（D-04 P1、D-02 C4）。地図は国土地理院の標準タイルを実行時に読む。出典を必ず出す。
// 筆界・法規の値（PLATEAU・登記）は未接続のため「未取得」と表示する（推測で埋めない）。
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { ATTRIBUTION, tileUrl } from '../map/tiles'
import {
  MAX_ZOOM,
  TILE_PX,
  VIEW_PX,
  clampZoom,
  isClick,
  panCenter,
  parseSitePoint,
  screenToLonLat,
  tileOnMap,
  tilesInView,
  wheelZoomSteps,
  worldToScreen,
  type LonLat,
  type Point,
} from '../map/viewport'
import { loadDistrictsAt, type DistrictLoad } from '../plateau/load'
import { districtsAndZonesName, fireUsageName } from '../plateau/codelist'
import { fireUsageMismatch } from '../plateau/zones'
import { useSite } from '../store/site'
import { fireDecisionLine } from '../law/fireZone'
import { OrdinanceForm } from './OrdinanceForm'
import { loadNeighborBuildings } from '../plateau/neighborBuildings'
import { useUi } from '../store/ui'
import { neighborVolumes } from '../volume/neighborLocal'
import { NeighborScene3D } from './NeighborScene3D'
import { PanelTile } from './PanelTile'
import { ChatTile } from './ChatTile'
import { isRightItemShown, useActiveMode } from '../store/mode'
import { SCREEN_MODES } from '../app/screenModes'
import { usePanelTiles } from '../store/panelTiles'

// 既定の地点は江東区の木場付近（zip の範囲内。半径 400 m に建物がある）。東京駅付近は千代田区で、この zip の外
const DEFAULT = { lon: 139.814, lat: 35.67 }
// 江東区（13108）の PLATEAU の CityGML（2025 年版）の zip。実行時に範囲取得する（同梱しない）。
// PLATEAU のホストは別の接続元なので、/plateau-assets/ の中継（開発は Vite、配備は Worker）を通す。
const KOTO_CITYGML_ZIP = '/plateau-assets/assets/55/c134fe-ccfb-4c1b-9054-d8c6f44b7597/13108_koto-ku_pref_2025_citygml_1_op.zip'
export function P1Site() {
  const [lonText, setLonText] = useState(String(DEFAULT.lon))
  const [latText, setLatText] = useState(String(DEFAULT.lat))
  const [zoom, setZoom] = useState(15)
  // 地図の中心（表示の中央）。対象地点とは別で、ドラッグで動く。経緯度を入れたときは、その地点へ寄る
  const [center, setCenter] = useState<LonLat>(DEFAULT)
  const [cityCode, setCityCode] = useState('13108')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DistrictLoad | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [zipUrl, setZipUrl] = useState(KOTO_CITYGML_ZIP)
  const [neighborLoading, setNeighborLoading] = useState(false)
  const [neighborError, setNeighborError] = useState<string | null>(null)
  const siteBuildings = useSite((s) => s.buildings)
  const showNeighbors = useUi((s) => s.showNeighbors)
  const siteOrigin = useSite((s) => s.sitePoint)
  // 3D の周辺建物（基準点を原点にした mm。P1 は敷地の外形を持たないので、周辺建物だけを置く）
  const [view3d, setView3d] = useState(false)
  const neighbors3d = useMemo(
    () => (siteBuildings && siteOrigin ? neighborVolumes(siteBuildings, siteOrigin, { x: 0, y: 0 }) : []),
    [siteBuildings, siteOrigin],
  )
  const show3d = view3d && neighbors3d.length > 0
  const mapRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ start: Point; last: Point; moved: boolean } | null>(null)
  // ホイールの、まだ段になっていない分（トラックパッドの細かい動きをためる）
  const wheelRef = useRef(0)

  // 地点の用途地域が一つに決まったときの値（PLATEAU）。無ければ未取得
  const siteDistrict = result && result.matches.length === 1 ? result.matches[0]! : null

  // 対象地点（経緯度の入力が正しいとき）
  const site = useMemo(() => parseSitePoint(lonText, latText), [lonText, latText])
  const siteScreen = site ? worldToScreen(site, center, zoom) : null

  // 経緯度の入力で対象地点を決める。入力が正しければ、地図の中心もそこへ寄せる
  const moveSiteByText = (lonValue: string, latValue: string) => {
    setLonText(lonValue)
    setLatText(latValue)
    const p = parseSitePoint(lonValue, latValue)
    if (p) setCenter(p)
    setResult(null)
    setError(null)
  }

  // 地図のクリックで対象地点を置く（中心は動かさない）
  const moveSiteByMap = (p: LonLat) => {
    setLonText(String(Number(p.lon.toFixed(6))))
    setLatText(String(Number(p.lat.toFixed(6))))
    setResult(null)
    setError(null)
  }

  const fetchDistricts = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await loadDistrictsAt({ lat: Number(latText), lon: Number(lonText), cityCode }, (url) => fetch(url))
      setResult(r)
      useSite.getState().setMatches(r.matches)
    } catch (e) {
      setResult(null)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const fetchNeighbors = async () => {
    setNeighborLoading(true)
    setNeighborError(null)
    try {
      const point = { lat: Number(latText), lon: Number(lonText) }
      const list = await loadNeighborBuildings(point, zipUrl)
      useSite.getState().setBuildings(list, point)
    } catch (e) {
      useSite.getState().setBuildings(null, null)
      setNeighborError(e instanceof Error ? e.message : String(e))
    } finally {
      setNeighborLoading(false)
    }
  }

  // 周辺建物の footprint を、表示の左上を原点にしたピクセルの多角形にする
  const buildingPolygons = useMemo(() => {
    if (!siteBuildings || !showNeighbors) return []
    return siteBuildings.flatMap((b) =>
      b.footprints.map((ring) =>
        ring
          .map((p) => {
            const s = worldToScreen(p, center, zoom)
            return `${s.x.toFixed(1)},${s.y.toFixed(1)}`
          })
          .join(' '),
      ),
    )
  }, [siteBuildings, center, zoom, showNeighbors])

  // 表示を覆うタイル（地図の範囲の外は描かない）
  const tiles = useMemo(() => {
    const out: { key: string; url: string; left: number; top: number }[] = []
    for (const t of tilesInView(center, zoom)) {
      const m = tileOnMap(t, zoom)
      if (m) out.push({ key: `${t.x}-${t.y}`, url: tileUrl(m, zoom), left: t.dx, top: t.dy })
    }
    return out
  }, [center, zoom])

  // ホイールで拡大縮小。3D の表示のときは地図を動かさない
  useEffect(() => {
    const el = mapRef.current
    if (!el || show3d) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const { steps, rest } = wheelZoomSteps(wheelRef.current, e.deltaY)
      wheelRef.current = rest
      if (steps !== 0) setZoom((z) => clampZoom(z - steps))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [show3d])

  // ドラッグで地図を動かす。動かさずに離したら、その点を対象地点にする
  const onMapPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = { x: e.clientX, y: e.clientY }
    dragRef.current = { start: p, last: p, moved: false }
  }
  // 指の動いた分（前回の位置から now まで）だけ地図を動かす
  const followPointer = (d: { last: Point; moved: boolean }, now: Point) => {
    d.moved = true
    // 差分は今の値で固定する（更新関数は後で走るので、d.last を読むと差分が 0 になる）
    const dx = now.x - d.last.x
    const dy = now.y - d.last.y
    d.last = now
    setCenter((c) => panCenter(c, zoom, dx, dy))
  }
  const onMapPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d) return
    const now = { x: e.clientX, y: e.clientY }
    if (!d.moved && isClick(d.start, now)) return
    followPointer(d, now)
  }
  // 離したときも、離した位置までの分を動かす（途中の動きが届かない速さの操作にも合わせる）
  const onMapPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    dragRef.current = null
    if (!d) return
    const end = { x: e.clientX, y: e.clientY }
    if (!d.moved && isClick(d.start, end)) {
      const rect = e.currentTarget.getBoundingClientRect()
      moveSiteByMap(screenToLonLat(e.clientX - rect.left, e.clientY - rect.top, center, zoom))
      return
    }
    followPointer(d, end)
  }

  // 右パネルの項目は、今のモードと画面の組で決まる（G100・G95）。P1 はチャットだけ
  const activeMode = useActiveMode('P1')
  const hiddenTiles = usePanelTiles((s) => s.hidden)
  const rightShown = (id: string) => isRightItemShown(SCREEN_MODES, activeMode, 'P1', hiddenTiles, id)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', height: '100%' }}>
      <div style={{ position: 'relative', overflow: 'hidden', background: '#e9e6dd' }}>
        {show3d ? (
          <div style={{ width: VIEW_PX, height: VIEW_PX }}>
            <NeighborScene3D neighbors={neighbors3d} />
          </div>
        ) : (
          <div
            ref={mapRef}
            onPointerDown={onMapPointerDown}
            onPointerMove={onMapPointerMove}
            onPointerUp={onMapPointerUp}
            onPointerCancel={() => {
              dragRef.current = null
            }}
            style={{ position: 'relative', width: VIEW_PX, height: VIEW_PX, cursor: 'crosshair', touchAction: 'none' }}
          >
            {tiles.map((t) => (
              <img
                key={t.key}
                src={t.url}
                alt=""
                width={TILE_PX}
                height={TILE_PX}
                draggable={false}
                style={{ position: 'absolute', left: t.left, top: t.top, userSelect: 'none' }}
              />
            ))}
            <svg width={VIEW_PX} height={VIEW_PX} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
              {buildingPolygons.map((pts, i) => (
                <polygon key={i} points={pts} fill="rgba(70,80,92,0.45)" stroke="#2b3138" strokeWidth={0.8} />
              ))}
              {siteScreen && <circle cx={siteScreen.x} cy={siteScreen.y} r={7} fill="rgba(211,51,51,0.25)" stroke="#d33" strokeWidth={2} />}
            </svg>
          </div>
        )}
        {!show3d && (
          <div style={{ position: 'absolute', left: 8, top: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button type="button" aria-label="拡大" onClick={() => setZoom((z) => clampZoom(z + 1))} disabled={zoom >= MAX_ZOOM}>
              ＋
            </button>
            <button type="button" aria-label="縮小" onClick={() => setZoom((z) => clampZoom(z - 1))} disabled={zoom <= 0}>
              −
            </button>
          </div>
        )}
        <div style={{ position: 'absolute', right: 6, bottom: 4, background: 'rgba(255,255,255,0.85)', padding: '2px 6px', fontSize: 12 }}>{ATTRIBUTION}</div>
      </div>
      <aside style={{ padding: 12, borderLeft: '1px solid #ddd8cc', background: '#fff', overflowY: 'auto' }}>
        <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>P1 敷地</h2>
        <p style={{ color: '#666', fontSize: 12, margin: '0 0 8px' }}>地図をクリックすると、その点を対象地点にします。ドラッグで動かし、ホイールか ＋ － で拡大縮小します。</p>
        <label style={{ display: 'block', marginBottom: 6 }}>
          経度
          <input value={lonText} onChange={(e) => moveSiteByText(e.target.value, latText)} style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 6 }}>
          緯度
          <input value={latText} onChange={(e) => moveSiteByText(lonText, e.target.value)} style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          ズーム
          <input type="number" min={0} max={MAX_ZOOM} value={zoom} onChange={(e) => setZoom(clampZoom(Number(e.target.value)))} style={{ width: '100%' }} />
        </label>
        <section>
          <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>法規の値</h3>
          <dl style={{ margin: 0 }}>
            <dt>用途地域・建蔽率・容積率</dt>
            <dd>
              {siteDistrict
                ? `建蔽率 ${siteDistrict.buildingCoverageRatePercent ?? '未取得'} %、容積率 ${siteDistrict.floorAreaRatePercent ?? '未取得'} %`
                : '未取得（地点を入れて「この地点の用途地域を取る」）'}
            </dd>
            <dt>前面道路の幅員</dt>
            <dd>仮置き: 筆界はダミー（20 m × 30 m）。登記情報は使わない（約款未確認）。手描きの筆界は未実装（D-02 C4 は代表の決定待ち）</dd>
            <dt>真北</dt>
            <dd>未算出（系番号は自治体で決まる。D-02 C4）</dd>
          </dl>
        </section>
        <section>
          <OrdinanceForm />
          <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>用途地域（PLATEAU・都市計画決定情報）</h3>
          <label style={{ display: 'block', marginBottom: 6 }}>
            区のコード（例: 13108 は江東区）
            <input value={cityCode} onChange={(e) => setCityCode(e.target.value)} style={{ width: '100%' }} />
          </label>
          <button type="button" onClick={fetchDistricts} disabled={loading}>
            {loading ? '取得中…' : 'この地点の用途地域を取る'}
          </button>
          {error && <p style={{ color: '#a33' }}>{error}</p>}
          {result && result.file === null && <p>この区の urf の項目が無い（{cityCode}）。</p>}
          {result && result.file !== null && result.matches.length === 0 && <p>この地点を含む用途地域は無い（境界上を含めない）。</p>}
          {result && result.matches.map((m) => (
            <dl key={m.id} style={{ margin: '6px 0' }}>
              <dt>区分コード</dt>
              <dd>{m.function === null ? '未取得' : `${m.function}（${districtsAndZonesName(m.function) ?? '名前が表に無い'}）`}</dd>
              <dt>容積率</dt>
              <dd>{m.floorAreaRatePercent === null ? '未取得' : `${m.floorAreaRatePercent} %`}</dd>
              <dt>建蔽率</dt>
              <dd>{m.buildingCoverageRatePercent === null ? '未取得' : `${m.buildingCoverageRatePercent} %`}</dd>
              <dt>高さの上限</dt>
              <dd>{m.heightLimitM === null ? '未取得' : `${m.heightLimitM} m`}</dd>
              <dt>告示番号</dt>
              <dd>{m.notificationNumber ?? '未取得'}</dd>
            </dl>
          ))}
          {result && result.fireMatches.length === 0 && result.file !== null && <p>防火地域・準防火地域: この地点には無い（境界上を含めない）。</p>}
          {result && result.fireMatches.map((f) => (
            <p key={f.id}>
              防火: {f.function === null ? '区分 未取得' : (districtsAndZonesName(f.function) ?? `区分 ${f.function}`)}
              {f.usage === null ? '（用途 未取得）' : `（用途コード ${f.usage}${fireUsageName(f.usage) ? `：${fireUsageName(f.usage)}` : ''}）`}
              {f.notificationNumber ? `、${f.notificationNumber}` : ''}
              {fireUsageMismatch(f) ? <span style={{ color: '#a33' }}>（区分と用途が合わない。元データの確認が要る）</span> : null}
            </p>
          ))}
          {result && result.file !== null && <p style={{ color: '#a86b00' }}>{fireDecisionLine(result.fireMatches.map((f) => ({ function: f.function })))}</p>}
          {result && result.heightMatches.length === 0 && result.file !== null && <p>高度地区: この地点には無い（境界上を含めない）。</p>}
          {result && result.heightMatches.map((h) => (
            <p key={h.id}>
              高度地区: 最高 {h.maximumBuildingHeightM === null ? '未取得' : `${h.maximumBuildingHeightM} m`}、最低 {h.minimumBuildingHeightM === null ? '未取得' : `${h.minimumBuildingHeightM} m`}
              {h.notificationNumber ? `、${h.notificationNumber}` : ''}
            </p>
          ))}
          {result && (result.fireUnknownOwner.length > 0 || result.heightUnknownOwner.length > 0) && (
            <p style={{ color: '#a33' }}>
              管理者が不明な項目: 防火 {result.fireUnknownOwner.length} 件、高度地区 {result.heightUnknownOwner.length} 件（この区の項目かは確認できない）
            </p>
          )}
          <p style={{ color: '#666', fontSize: 12 }}>出典: 国土交通省 PLATEAU（利用条件は未確認）。斜線・日影は urf に無い（条例で補う）。</p>
        </section>
        <section>
          <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>周辺建物（PLATEAU・3 次メッシュ）</h3>
          <label style={{ display: 'block', marginBottom: 6 }}>
            区の CityGML の zip（江東区 2025 年版）
            <input value={zipUrl} onChange={(e) => setZipUrl(e.target.value)} style={{ width: '100%' }} />
          </label>
          <button type="button" onClick={fetchNeighbors} disabled={neighborLoading}>
            {neighborLoading ? '取得中…（建物ファイルを範囲取得しています）' : '周辺建物を取る'}
          </button>
          {siteBuildings && neighbors3d.length > 0 && (
            <button type="button" onClick={() => setView3d((v) => !v)} style={{ marginLeft: 8 }}>
              {view3d ? '地図で見る' : '3D で見る'}
            </button>
          )}
          {neighborError && <p style={{ color: '#a33' }}>{neighborError}</p>}
          {siteBuildings && (
            <p>
              周辺建物 {siteBuildings.length} 棟（基準点から半径 400 m 以内）。高さ不明 {siteBuildings.filter((b) => b.heightM === null).length} 棟は 3D に出ません。
            </p>
          )}
          <p style={{ color: '#666', fontSize: 12 }}>出典: 国土交通省 PLATEAU（建物データ。利用条件は未確認）。zip は同梱せず、必要な建物ファイルだけ取ります。</p>
        </section>
        {!rightShown('claude-chat') ? null : (
          <PanelTile title="Claude（チャット）" onHide={() => usePanelTiles.getState().hideTile('claude-chat')}>
            <h2>Claude（チャット）</h2>
            <ChatTile screen="P1" />
          </PanelTile>
        )}
      </aside>
    </div>
  )
}
