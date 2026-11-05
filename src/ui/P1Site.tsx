// P1 敷地（D-04 P1、D-02 C4）。地図は国土地理院の標準タイルを実行時に読む。出典を必ず出す。
// 筆界・法規の値（PLATEAU・登記）は未接続のため「未取得」と表示する（推測で埋めない）。
import { useEffect, useMemo, useState } from 'react'
import { MAX_ZOOM, clampZoom, parseSitePoint, type LonLat } from '../map/viewport'
import { neighborRings as toNeighborRings } from '../map/neighborRings'
import { DEMO_INITIAL_VIEW, DEMO_SITE } from '../map/initialView'
import { PARCEL_BOUNDARY_NOTE, sourceLabel } from '../data/sources'
import { P1Map } from './P1Map'
import { POSTAL_UNAVAILABLE_NOTICE } from '../geocode/postalNotice'
import { districtsAndZonesName, fireUsageName } from '../plateau/codelist'
import { fireUsageMismatch } from '../plateau/zones'
import { useSite } from '../store/site'
import { fireDecisionLine } from '../law/fireZone'
import { OrdinanceForm } from './OrdinanceForm'
import { useConfirmedSite, isConfirmedStaleOf, startSiteOf } from '../store/confirmedSite'
import { districtStatusTextOf } from './districtFetch'
import { geometryOfParcel } from '../map/selectedParcel'
import { parcelFrameOf, parcelRingOf } from '../map/parcelPlane'
import { parcelNoticeOf } from '../plan/lot'
import { interiorPointOf } from '../map/interiorPoint'
import { useUi } from '../store/ui'
import { searchAddress, type AddressCandidate } from '../geocode/gsiAddress'
import { PanelTile } from './PanelTile'
import { ChatTile } from './ChatTile'
import { isRightItemShown, useActiveMode } from '../store/mode'
import { SCREEN_MODES } from '../app/screenModes'
import { usePanelTiles } from '../store/panelTiles'

// 既定の地点は、デモで扱う筆 2-7（新砂３丁目）の内側の点（initialView の DEMO_SITE）
const DEFAULT = DEMO_SITE
// 江東区（13108）の PLATEAU の CityGML（2025 年版）の zip。実行時に範囲取得する（同梱しない）。
// PLATEAU のホストは別の接続元なので、/plateau-assets/ の中継（開発は Vite、配備は Worker）を通す。
const KOTO_CITYGML_ZIP = '/plateau-assets/assets/55/c134fe-ccfb-4c1b-9054-d8c6f44b7597/13108_koto-ku_pref_2025_citygml_1_op.zip'
export function P1Site({ onNext }: { onNext?: () => void } = {}) {
  // 開き直すときは、店舗の今いる地点から始める（既定の地点に戻すと、確定のあとに確定し直しになる。統括の依頼 2026-11-06。1）
  const startSite = startSiteOf(useConfirmedSite.getState().currentSite, DEFAULT)
  const [lonText, setLonText] = useState(String(startSite.lon))
  const [latText, setLatText] = useState(String(startSite.lat))
  const [zoom, setZoom] = useState(DEMO_INITIAL_VIEW.zoom)
  // 地図の中心（表示の中央）。対象地点とは別で、ドラッグで動く。経緯度を入れたときは、その地点へ寄る
  const [center, setCenter] = useState<LonLat>(
    useConfirmedSite.getState().currentSite ? { lon: startSite.lon, lat: startSite.lat } : { lon: DEMO_INITIAL_VIEW.center[0], lat: DEMO_INITIAL_VIEW.center[1] },
  )
  const [cityCode, setCityCode] = useState('13108')
  // 用途地域の取得（店舗が持つ。取っている間・失敗・結果。P1 から P2 へ移っても残る。統括の依頼 2026-11-06。1）
  const { loading, data: result, error } = useConfirmedSite((s) => s.district)
  const confirmed = useConfirmedSite((s) => s.confirmed)
  const parcelUid = useSite((s) => s.parcelUid)
  // 選んだ筆（地図で選んだもの）。注記に使う
  const parcel = useSite((s) => s.parcel)
  const [zipUrl, setZipUrl] = useState(KOTO_CITYGML_ZIP)
  const { loading: neighborLoading, error: neighborError } = useConfirmedSite((s) => s.buildings)
  // 住所検索（国土地理院の住所 API）。候補を選ぶと、その経緯度を対象地点にする
  const [addressText, setAddressText] = useState('')
  const [candidates, setCandidates] = useState<AddressCandidate[]>([])
  const [addressLoading, setAddressLoading] = useState(false)
  const [addressError, setAddressError] = useState<string | null>(null)
  const siteBuildings = useSite((s) => s.buildings)
  // 選んだ筆の情報の文（店舗の選択と同じ。含む筆が無ければ「この地点を含む筆は無い」）
  const parcelInfo = useSite((s) => s.parcelInfo)
  const showNeighbors = useUi((s) => s.showNeighbors)
  // 地図の下にある情報（選んだ筆・建物・道路）と、読み込みの状態
  const [mapInfo, setMapInfo] = useState('建物をクリックすると、高さを表示します。道路をクリックすると、幅員区分を表示します。')
  const [mapStatus, setMapStatus] = useState('読み込み中…')
  const [postalNotice, setPostalNotice] = useState<string | null>(null)

  // 地点の用途地域が一つに決まったときの値（PLATEAU）。無ければ未取得
  const siteDistrict = result && result.matches.length === 1 ? result.matches[0]! : null

  // 対象地点（経緯度の入力が正しいとき）
  const site = useMemo(() => parseSitePoint(lonText, latText), [lonText, latText])
  // 今いる地点を店舗へ（P2 の確定し直しの判定に使う）
  useEffect(() => {
    useConfirmedSite.getState().setCurrentSite(site)
  }, [site])

  // 経緯度の入力で対象地点を決める。入力が正しければ、地図の中心もそこへ寄せる
  const moveSiteByText = (lonValue: string, latValue: string) => {
    setLonText(lonValue)
    setLatText(latValue)
    const p = parseSitePoint(lonValue, latValue)
    if (p) setCenter(p)
    useConfirmedSite.getState().resetDistrict()
  }

  // 地図のクリックで対象地点を置く（中心は動かさない）
  const moveSiteByMap = (p: LonLat) => {
    setLonText(String(Number(p.lon.toFixed(6))))
    setLatText(String(Number(p.lat.toFixed(6))))
    useConfirmedSite.getState().resetDistrict()
  }

  const fetchDistricts = () => {
    if (site === null) return
    void useConfirmedSite.getState().fetchDistrictAt(site, cityCode)
  }

  const runAddressSearch = async () => {
    setAddressLoading(true)
    setAddressError(null)
    try {
      const list = await searchAddress(addressText)
      setCandidates(list)
      if (list.length === 0 && addressText.trim() !== '') setAddressError('該当する住所がありません')
    } catch (e) {
      setCandidates([])
      setAddressError(e instanceof Error ? e.message : String(e))
    } finally {
      setAddressLoading(false)
    }
  }

  const pickCandidate = (c: AddressCandidate) => {
    moveSiteByText(String(c.lon), String(c.lat))
    setCandidates([])
  }

  const fetchNeighbors = () => {
    void useConfirmedSite.getState().fetchBuildingsAt({ lat: Number(latText), lon: Number(lonText) }, zipUrl)
  }

  // この敷地で確定（統括の依頼 2026-11-06。1）: 選んだ筆（無ければダミー）と、筆の中の点を一つにして店舗に固定し、その地点の用途地域と周辺建物を取り、P2 へ移る
  const confirmSite = () => {
    if (site === null) return
    const uid = useSite.getState().parcelUid
    const geometry = uid === null ? undefined : geometryOfParcel(uid)
    const center = (geometry === undefined ? null : interiorPointOf(geometry)) ?? site
    moveSiteByText(String(center.lon), String(center.lat))
    useConfirmedSite.getState().confirm({
      parcelUid: geometry === undefined ? null : uid,
      lot: geometry === undefined ? null : parcelRingOf(geometry),
      frame: geometry === undefined ? null : parcelFrameOf(geometry),
      center: { lat: center.lat, lon: center.lon },
      roadEdge: useConfirmedSite.getState().roadEdge,
    })
    void useConfirmedSite.getState().fetchDistrictAt(center, cityCode)
    void useConfirmedSite.getState().fetchBuildingsAt(center, zipUrl)
    onNext?.()
  }

  // 周辺建物の輪郭（経度・緯度）。地図に重ねる。3D は地図の傾きで見る（LOD1）ので、別の 3D 画面は持たない
  const neighborRings = useMemo(() => toNeighborRings(siteBuildings, showNeighbors), [siteBuildings, showNeighbors])

  // 右パネルの項目は、今のモードと画面の組で決まる（G100・G95）。P1 はチャットだけ
  const activeMode = useActiveMode('P1')
  const hiddenTiles = usePanelTiles((s) => s.hidden)
  const rightShown = (id: string) => isRightItemShown(SCREEN_MODES, activeMode, 'P1', hiddenTiles, id)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', height: '100%' }}>
      <div style={{ position: 'relative', overflow: 'hidden', background: '#e9e6dd' }}>
        <P1Map
          center={center}
          zoom={zoom}
          site={site}
          neighborRings={neighborRings}
          onSiteClick={moveSiteByMap}
          onInfo={setMapInfo}
          onStatus={setMapStatus}
          onView={(c, z) => {
            setCenter(c)
            setZoom(z)
          }}
        />
      </div>
      <aside style={{ padding: 12, borderLeft: '1px solid #ddd8cc', background: '#fff', overflowY: 'auto' }}>
        <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>敷地</h2>
        <p style={{ color: '#666', fontSize: 12, margin: '0 0 8px' }}>地図をクリックすると、その点を対象地点にします。ドラッグで動かし、ホイールかピンチで拡大縮小します。</p>
        <p style={{ color: '#666', fontSize: 12, margin: '0 0 4px' }}>{mapStatus}</p>
        <p style={{ fontSize: 13, margin: '0 0 4px' }}>{parcelInfo ?? ''}</p>
        <div style={{ margin: '0 0 8px' }}>
          <button type="button" onClick={confirmSite} disabled={site === null} style={{ fontWeight: 700 }}>この敷地で確定（ボリュームへ）</button>
          {confirmed === null ? <p style={{ color: '#666', fontSize: 12, margin: '4px 0 0' }}>まだ確定していない（ボリュームはダミーの筆界）</p> : null}
          {confirmed !== null && confirmed.lot === null ? <p style={{ color: '#666', fontSize: 12, margin: '4px 0 0' }}>筆が無い（ダミーの筆界で進む）</p> : null}
          {confirmed !== null && isConfirmedStaleOf(confirmed, parcelUid, site) ? <p style={{ color: '#a86b00', fontSize: 12, margin: '4px 0 0' }}>確定し直しが要る（地点か筆を変えました）</p> : null}
        </div>
        <p style={{ fontSize: 13, margin: '0 0 4px' }}>{mapInfo}</p>
        <p style={{ color: '#666', fontSize: 12, margin: '0 0 8px' }}>{PARCEL_BOUNDARY_NOTE}</p>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>
            住所
            <input
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void runAddressSearch()
              }}
              placeholder="例: 東京都江東区東陽4-11-28"
              style={{ width: '100%' }}
            />
          </label>
          <button type="button" onClick={() => void runAddressSearch()} disabled={addressLoading}>
            {addressLoading ? '検索中…' : '住所で探す'}
          </button>
          {addressError && <p style={{ color: '#a33' }}>{addressError}</p>}
          {candidates.length > 0 && (
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {candidates.map((c) => (
                <li key={`${c.lon},${c.lat},${c.title}`} style={{ marginBottom: 4 }}>
                  <button type="button" onClick={() => pickCandidate(c)} style={{ textAlign: 'left' }}>
                    {c.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p style={{ color: '#666', fontSize: 12, margin: '4px 0 0' }}>出典: {sourceLabel('gsiAddress')}</p>
        </div>
        <div style={{ marginBottom: 12, opacity: 0.45 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>
            郵便番号
            <input placeholder="例: 135-8383" style={{ width: '100%' }} />
          </label>
          <button type="button" onClick={() => setPostalNotice(POSTAL_UNAVAILABLE_NOTICE)}>
            郵便番号で探す
          </button>
          {postalNotice ? <p style={{ color: '#666', fontSize: 12, margin: '4px 0 0' }}>{postalNotice}</p> : null}
        </div>
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
            <dd>{parcelNoticeOf(parcel)}</dd>
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
          {districtStatusTextOf({ loading, error }) !== null ? <p style={{ color: '#666', fontSize: 12 }}>{districtStatusTextOf({ loading, error })}</p> : null}
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
          <p style={{ color: '#666', fontSize: 12 }}>出典: {sourceLabel('plateau')}。斜線・日影は urf に無い（条例で補う）。</p>
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
          {neighborError && <p style={{ color: '#a33' }}>{neighborError}</p>}
          {siteBuildings && (
            <p>
              周辺建物 {siteBuildings.length} 棟（基準点から半径 400 m 以内）。高さ不明 {siteBuildings.filter((b) => b.heightM === null).length} 棟は 3D に出ません。
            </p>
          )}
          <p style={{ color: '#666', fontSize: 12 }}>出典: {sourceLabel('plateau')}（建物データ）。zip は同梱せず、必要な建物ファイルだけ取ります。</p>
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
