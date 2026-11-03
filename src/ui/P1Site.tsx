// P1 敷地（D-04 P1、D-02 C4）。地図は国土地理院の標準タイルを実行時に読む。出典を必ず出す。
// 筆界・法規の値（PLATEAU・登記）は未接続のため「未取得」と表示する（推測で埋めない）。
import { useMemo, useState } from 'react'
import { ATTRIBUTION, tileFromLonLat, tileUrl } from '../map/tiles'
import { loadDistrictsAt, type DistrictLoad } from '../plateau/load'
import { useSite } from '../store/site'
import { loadNeighborBuildings } from '../plateau/neighborBuildings'
import { worldPixel } from '../map/worldPixel'
import { useUi } from '../store/ui'
import { neighborVolumes } from '../volume/neighborLocal'
import { NeighborScene3D } from './NeighborScene3D'

// 既定の地点は江東区の木場付近（zip の範囲内。半径 400 m に建物がある）。東京駅付近は千代田区で、この zip の外
const DEFAULT = { lon: 139.814, lat: 35.67 }
// 江東区（13108）の PLATEAU の CityGML（2025 年版）の zip。実行時に範囲取得する（同梱しない）。
// PLATEAU のホストは別の接続元なので、/plateau-assets/ の中継（開発は Vite、配備は Worker）を通す。
const KOTO_CITYGML_ZIP = '/plateau-assets/assets/55/c134fe-ccfb-4c1b-9054-d8c6f44b7597/13108_koto-ku_pref_2025_citygml_1_op.zip'

export function P1Site() {
  const [lonText, setLonText] = useState(String(DEFAULT.lon))
  const [latText, setLatText] = useState(String(DEFAULT.lat))
  const [zoom, setZoom] = useState(15)
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

  // 地点の用途地域が一つに決まったときの値（PLATEAU）。無ければ未取得
  const siteDistrict = result && result.matches.length === 1 ? result.matches[0]! : null

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

  // 周辺建物の footprint を、3×3 タイルの左上を原点にしたピクセルの多角形にする
  const buildingPolygons = useMemo(() => {
    if (!siteBuildings || !showNeighbors) return []
    try {
      const c = tileFromLonLat({ lon: Number(lonText), lat: Number(latText) }, zoom)
      const ox = (c.x - 1) * 256
      const oy = (c.y - 1) * 256
      return siteBuildings.flatMap((b) =>
        b.footprints.map((ring) =>
          ring
            .map((p) => {
              const w = worldPixel(p, zoom)
              return `${(w.x - ox).toFixed(1)},${(w.y - oy).toFixed(1)}`
            })
            .join(' '),
        ),
      )
    } catch {
      return []
    }
  }, [siteBuildings, lonText, latText, zoom, showNeighbors])

  const tiles = useMemo(() => {
    const lon = Number(lonText)
    const lat = Number(latText)
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null
    try {
      const c = tileFromLonLat({ lon, lat }, zoom)
      const out: { key: string; url: string }[] = []
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const t = { x: c.x + dx, y: c.y + dy }
        out.push({ key: `${t.x}-${t.y}`, url: tileUrl(t, zoom) })
      }
      return out
    } catch {
      return null
    }
  }, [lonText, latText, zoom])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', height: '100%' }}>
      <div style={{ position: 'relative', overflow: 'hidden', background: '#e9e6dd' }}>
        {view3d && neighbors3d.length > 0 ? (
          <div style={{ width: 768, height: 768 }}>
            <NeighborScene3D neighbors={neighbors3d} />
          </div>
        ) : tiles ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 256px)', gridTemplateRows: 'repeat(3, 256px)', width: 768, height: 768 }}>
            {tiles.map((t) => (
              <img key={t.key} src={t.url} alt="" width={256} height={256} />
            ))}
          </div>
        ) : (
          <p style={{ padding: 16 }}>経度・緯度を入れてください</p>
        )}
        {!view3d && tiles && buildingPolygons.length > 0 && (
          <svg width={768} height={768} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
            {buildingPolygons.map((pts, i) => (
              <polygon key={i} points={pts} fill="rgba(70,80,92,0.45)" stroke="#2b3138" strokeWidth={0.8} />
            ))}
          </svg>
        )}
        <div style={{ position: 'absolute', right: 6, bottom: 4, background: 'rgba(255,255,255,0.85)', padding: '2px 6px', fontSize: 12 }}>{ATTRIBUTION}</div>
      </div>
      <aside style={{ padding: 12, borderLeft: '1px solid #ddd8cc', background: '#fff', overflowY: 'auto' }}>
        <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>P1 敷地</h2>
        <label style={{ display: 'block', marginBottom: 6 }}>
          経度
          <input value={lonText} onChange={(e) => setLonText(e.target.value)} style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 6 }}>
          緯度
          <input value={latText} onChange={(e) => setLatText(e.target.value)} style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          ズーム
          <input type="number" min={0} max={18} value={zoom} onChange={(e) => setZoom(Math.min(18, Math.max(0, Math.floor(Number(e.target.value) || 0))))} style={{ width: '100%' }} />
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
            <dd>未取得（筆界の取得が未決。D-02 C4）</dd>
            <dt>真北</dt>
            <dd>未算出（系番号は自治体で決まる。D-02 C4）</dd>
          </dl>
        </section>
        <section>
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
              <dd>{m.function ?? '未取得'}</dd>
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
              防火: {f.function === 24 ? '防火地域' : f.function === 25 ? '準防火地域' : `区分 ${f.function ?? '未取得'}`}
              {f.usage === null ? '（用途 未取得）' : `（用途コード ${f.usage}）`}
              {f.notificationNumber ? `、${f.notificationNumber}` : ''}
            </p>
          ))}
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
      </aside>
    </div>
  )
}
