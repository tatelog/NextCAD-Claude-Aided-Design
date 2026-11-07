import { loadRoadData } from '../store/roadData'
// P1 の地図（MapLibre GL JS）。基図は国土地理院の標準地図（彩度を下げる）。
// 道路・筆・建物（LOD1）は、利用者が準備して public/local-data/ に置いたファイルを読む。無ければ「未取得」と出す（同梱しない）。
import { useEffect, useRef } from 'react'
import { Map as MaplibreMap, Marker, NavigationControl, ScaleControl, setWorkerUrl, type GeoJSONSource, type GeoJSONSourceSpecification, type Point } from 'maplibre-gl'
import { relativeMapMagnification } from '../map/magnification'
import { topViewAt } from '../map/topView'
import 'maplibre-gl/dist/maplibre-gl.css'
import { GSI_BASEMAP_ATTRIBUTION, GSI_BASEMAP_TILES, gsiBasemapLayer } from '../map/basemap'
import { ROAD_WIDTH_CLASSES } from '../map/roadStyle'
import { DEMO_INITIAL_VIEW, DEMO_PARCEL_UID } from '../map/initialView'
import { parcelUid } from '../map/parcelInfo'
import { decodeLocalJson } from '../map/localData'
import { MAPLIBRE_WORKER_URL } from '../map/workerUrl'
import type { LonLat } from '../map/viewport'
import { publishSelectedParcel, rememberParcelGeometry, selectParcelAt } from '../map/selectedParcel'
import { layerBeforeOf } from '../map/layerBefore'
import { parcelOnLoadOf } from '../map/parcelOnLoad'
import { useSite } from '../store/site'

const LOCAL_DATA = '/local-data/'

// 本番の Worker は、dist に出したファイルを読む（t93）。開発は MapLibre の既定（隣の -dev の Worker）のまま
if (import.meta.env.PROD) setWorkerUrl(MAPLIBRE_WORKER_URL)

type Props = {
  center: LonLat
  zoom: number
  site: LonLat | null
  // 周辺建物の輪郭（経度・緯度の環の配列）。表示する
  neighborRings: [number, number][][]
  onSiteClick: (p: LonLat) => void
  onSiteInspect?: (p: LonLat, roads: string[]) => void
  onInfo: (text: string) => void
  onStatus: (text: string) => void
  onView: (center: LonLat, zoom: number) => void
}

type Latest = Props

// 置かれたファイルを読む（gzip でも、展開済みの JSON でもよい）
async function loadLocal(name: string): Promise<unknown> {
  const res = await fetch(LOCAL_DATA + name)
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
  return decodeLocalJson(new Uint8Array(await res.arrayBuffer()))
}

// 道路の JSON（{ roads: [{ w, c, g }] }）を、GeoJSON の線にする。g が入れ子なら複数の線
function toRoadFeatures(roads: { w: number; c: number; g: unknown }[]) {
  return roads.map((r) => {
    const multi = Array.isArray((r.g as unknown[])[0]) && Array.isArray(((r.g as unknown[])[0] as unknown[])[0])
    return {
      type: 'Feature' as const,
      properties: { w: r.w, c: r.c },
      geometry: multi
        ? { type: 'MultiLineString' as const, coordinates: r.g as number[][][] }
        : { type: 'LineString' as const, coordinates: r.g as number[][] },
    }
  })
}

export function P1Map(props: Props) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MaplibreMap | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const latest = useRef<Latest>(props)
  latest.current = props
  const selectedRef = useRef<string | null>(null)
  // 地点（住所・座標の入力・地図のクリック）が変わったら、その地点を含む筆を選ぶ。含む筆が無ければ選択を外す（統括の依頼 2026-11-06。2 件目）。
  // 読み込み時の地点では選び直さない（デモの筆を最初から選ぶ）。StrictMode の二重実行でも、同じ地点なら何もしない
  const lastSiteRef = useRef<LonLat | null>(props.site)
  useEffect(() => {
    const site = props.site
    if (site === lastSiteRef.current) return
    lastSiteRef.current = site
    let uid: string | null = null
    if (site) uid = selectParcelAt(site.lon, site.lat)
    else publishSelectedParcel(null)
    showSelectedParcel(mapRef.current, selectedRef, uid)
  }, [props.site])

  // 地図は一度だけ作る
  useEffect(() => {
    if (!elRef.current) return
    const map = new MaplibreMap({
      container: elRef.current,
      style: {
        version: 8,
        sources: {
          'gsi-basemap': {
            type: 'raster',
            tiles: [...GSI_BASEMAP_TILES],
            tileSize: 256,
            maxzoom: 18,
            attribution: GSI_BASEMAP_ATTRIBUTION,
          },
        },
        layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#e9e6dd' } }, gsiBasemapLayer()],
      },
      center: [latest.current.center.lon, latest.current.center.lat],
      zoom: latest.current.zoom,
      pitch: DEMO_INITIAL_VIEW.pitch,
      bearing: DEMO_INITIAL_VIEW.bearing,
      maxPitch: 85,
    })
    map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right')
    map.doubleClickZoom.disable()
    const inspectPoint = (p:LonLat) => {
      map.jumpTo(topViewAt(p.lon, p.lat, DEMO_INITIAL_VIEW.zoom))
      const uid = selectParcelAt(p.lon, p.lat)
      showSelectedParcel(map, selectedRef, uid)
      const point = map.project([p.lon,p.lat])
      const layers = ROAD_WIDTH_CLASSES.map((w) => `roads-w${w.k}`).filter((id) => map.getLayer(id))
      const roads = layers.length ? map.queryRenderedFeatures([[point.x - 100, point.y - 100], [point.x + 100, point.y + 100]], { layers }) : []
      const labels = [...new Set(roads.flatMap((r) => {
        const width = ROAD_WIDTH_CLASSES.find((w) => w.k === Number(r.properties.w))
        return width ? [width.label] : []
      }))]
      latest.current.onSiteInspect?.(p, labels)
      window.dispatchEvent(new Event('tutorial-site-inspected'))
    }
    map.on('dblclick',e=>{e.preventDefault();inspectPoint({lon:e.lngLat.lng,lat:e.lngLat.lat})})
    const inspectSelected=()=>{const p=latest.current.site;if(p)inspectPoint(p)}
    window.addEventListener('tutorial-inspect-selected',inspectSelected)
    map.addControl(new ScaleControl({ maxWidth: 160, unit: 'metric' }), 'bottom-left')
    const magnification = document.createElement('div')
    magnification.className = 'maplibregl-ctrl'
    magnification.style.cssText = 'background:rgba(255,255,255,.92);color:#222;padding:4px 8px;border-radius:4px;font-size:12px;pointer-events:none'
    const updateMagnification = () => {
      magnification.textContent = `倍率 ${relativeMapMagnification(map.getZoom(), DEMO_INITIAL_VIEW.zoom).toFixed(2)}×（初期比）`
    }
    map.addControl({
      onAdd: () => { updateMagnification(); map.on('zoom', updateMagnification); return magnification },
      onRemove: () => { map.off('zoom', updateMagnification); magnification.remove() },
    }, 'bottom-left')
    mapRef.current = map
    const marker = new Marker({ color: '#dc2626', anchor: 'bottom', pitchAlignment: 'viewport', rotationAlignment: 'viewport' })
    marker.getElement().style.pointerEvents = 'none'
    marker.getElement().setAttribute('aria-label', '選択地点')
    marker.getElement().setAttribute('data-tutorial', 'site-selected')
    map.on('render',()=>window.dispatchEvent(new Event('tutorial-target-change')))
    markerRef.current = marker
    syncSite(map, marker, latest.current.site)
    const resize = new ResizeObserver(() => map.resize())
    resize.observe(elRef.current)

    map.on('load', () => {
      map.addSource('neighbors', { type: 'geojson', data: emptyFc() })

      map.addLayer({
        id: 'neighbors',
        type: 'fill',
        source: 'neighbors',
        paint: { 'fill-color': '#46505c', 'fill-opacity': 0.45 },
      })
      syncNeighbors(map, latest.current.neighborRings)

      void loadLocalLayers(map, latest.current.onStatus, selectedRef)
    })

    map.on('click', (e) => {
      const { onInfo, onSiteClick } = latest.current
      onSiteClick({ lon: e.lngLat.lng, lat: e.lngLat.lat })
      // 選んだ筆は、地点が変わったときに決める（上の effect。住所・座標の入力と同じ規則）
      const info = infoAt(map, e.point)
      if (info) onInfo(info)
    })
    map.on('mouseenter', 'parcels-fill', () => (map.getCanvas().style.cursor = 'pointer'))
    map.on('mouseleave', 'parcels-fill', () => (map.getCanvas().style.cursor = ''))
    map.on('moveend', () => {
      const c = map.getCenter()
      latest.current.onView({ lon: c.lng, lat: c.lat }, map.getZoom())
    })

    return () => {
      resize.disconnect()
      window.removeEventListener('tutorial-inspect-selected',inspectSelected)
      marker.remove()
      markerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [])

  // 対象地点の表示
  useEffect(() => {
    const map = mapRef.current
    if (map && markerRef.current) syncSite(map, markerRef.current, props.site)
  }, [props.site])

  // 周辺建物の表示
  useEffect(() => {
    const map = mapRef.current
    if (map && map.isStyleLoaded()) syncNeighbors(map, props.neighborRings)
  }, [props.neighborRings])

  // 外から来た中心・ズーム（入力、住所候補、＋－）に地図を合わせる。地図の操作で変わった分は合わせない
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const c = map.getCenter()
    const same = Math.abs(c.lng - props.center.lon) < 1e-7 && Math.abs(c.lat - props.center.lat) < 1e-7
    if (!same || Math.abs(map.getZoom() - props.zoom) > 1e-6) {
      map.easeTo({ center: [props.center.lon, props.center.lat], zoom: props.zoom, duration: 300 })
    }
  }, [props.center, props.zoom])

  return <div ref={elRef} style={{ position: 'absolute', inset: 0 }} aria-label="地図" />
}

function emptyFc() {
  return { type: 'FeatureCollection' as const, features: [] }
}

function syncSite(map: MaplibreMap, marker: Marker, site: LonLat | null) {
  if (site) marker.setLngLat([site.lon, site.lat]).addTo(map)
  else marker.remove()
  window.dispatchEvent(new Event('tutorial-target-change'))
}

function syncNeighbors(map: MaplibreMap, rings: [number, number][][]) {
  const src = map.getSource('neighbors') as GeoJSONSource | undefined
  if (!src) return
  src.setData({
    type: 'FeatureCollection',
    features: rings.map((ring) => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } })),
  })
}

// 点にある筆・建物・道路の情報（筆を優先）
function infoAt(map: MaplibreMap, point: Point): string | null {
  const bldg = map.queryRenderedFeatures(point, { layers: ['bldg-3d'] })
  if (bldg.length > 0) return `建物の高さ ${bldg[0]!.properties.h} m`
  const roads = map.queryRenderedFeatures(point, { layers: ROAD_WIDTH_CLASSES.map((w) => `roads-w${w.k}`) })
  if (roads.length > 0) {
    const w = ROAD_WIDTH_CLASSES.find((x) => x.k === roads[0]!.properties.w)
    return `道路の幅員区分：${w ? w.label : '不明'}`
  }
  return null
}

// 道路・筆・建物を、利用者が置いたファイルから読んで、地図に重ねる
async function loadLocalLayers(
  map: MaplibreMap,
  onStatus: (s: string) => void,
  selectedRef: { current: string | null },
) {
  const missing: string[] = []
  try {
    const roadsJson = { roads: await loadRoadData() }
    map.addSource('roads', { type: 'geojson', data: { type: 'FeatureCollection', features: toRoadFeatures(roadsJson.roads) } })
    for (const w of ROAD_WIDTH_CLASSES) {
      map.addLayer({
        id: `roads-w${w.k}`,
        type: 'line',
        source: 'roads',
        filter: ['==', ['get', 'w'], w.k],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': w.color, 'line-width': ['interpolate', ['linear'], ['zoom'], 13, w.px * 0.5, 17, w.px] },
      }, neighborsBefore(map))
    }
  } catch {
    missing.push('道路')
  }
  try {
    const parcels = (await loadLocal('koto-parcels.geojson')) as { features: { properties: Record<string, string>; geometry: unknown }[] }
    // 筆の識別子（地図名と筆IDの組）を、筆ごとに付ける
    for (const f of parcels.features) {
      const uid = parcelUid(f.properties as { 地図名: string; 筆ID: string })
      f.properties['筆UID'] = uid
      rememberParcelGeometry(uid, f.geometry, f.properties)
    }
    map.addSource('parcels', { type: 'geojson', data: parcels as GeoJSONSourceSpecification['data'], promoteId: '筆UID' })
    map.addLayer({
      id: 'parcels-fill',
      type: 'fill',
      source: 'parcels',
      paint: {
        'fill-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#f5b301', '#9fc1d6'],
        'fill-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.6, 0.15],
      },
    }, neighborsBefore(map))
    map.addLayer({ id: 'parcels-line', type: 'line', source: 'parcels', paint: { 'line-color': '#3a4a5a', 'line-width': 0.9 } }, neighborsBefore(map))
    // デモの筆を、最初から選択した状態で出す（情報欄にも）
    const demo = parcels.features.find((f) => f.properties['筆UID'] === DEMO_PARCEL_UID)
    if (demo) {
      // 筆が既に選ばれていれば、その筆を残す（開き直しで確定した筆を、デモの筆で上書きしない。統括の依頼 2026-11-06。1）。無ければデモの筆
      const uid = parcelOnLoadOf(useSite.getState().parcelUid, DEMO_PARCEL_UID)
      selectedRef.current = uid
      selectParcelVisual(map, uid)
      publishSelectedParcel(uid)
    }
  } catch {
    missing.push('筆')
  }
  try {
    const bldg = (await loadLocal('buildings-koto.geojson.gz')) as { features: unknown[] }
    map.addSource('bldg', { type: 'geojson', data: bldg as GeoJSONSourceSpecification['data'] })
    map.addLayer({
      id: 'bldg-3d',
      type: 'fill-extrusion',
      source: 'bldg',
      paint: {
        'fill-extrusion-color': ['interpolate', ['linear'], ['get', 'h'], 0, '#c9d6df', 20, '#8fb3cc', 60, '#4f83a8', 120, '#1f5f8b'],
        'fill-extrusion-height': ['get', 'h'],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.9,
      },
    })
  } catch {
    missing.push('建物')
  }
  onStatus(missing.length === 0 ? '' : `未取得：${missing.join('、')}`)
}

// 選んだ筆の見た目（地図の塗り）を、選んだ筆に合わせる。前に選んだ筆の選択は外す。地図の筆がまだ読めていないときは見た目だけ変えない（次に地点を変えたときに合う）
function showSelectedParcel(map: MaplibreMap | null, selectedRef: { current: string | null }, uid: string | null) {
  if (map && map.getSource('parcels') && map.isSourceLoaded('parcels')) {
    if (selectedRef.current !== null) map.setFeatureState({ source: 'parcels', id: selectedRef.current }, { selected: false })
    if (uid !== null) map.setFeatureState({ source: 'parcels', id: uid }, { selected: true })
  }
  selectedRef.current = uid
}

// 道路・筆の層を足す位置（基準の層 neighbors の前）。neighbors がまだ地図に無ければ、基準を付けずに足す（統括の依頼 2026-11-06。3）
function neighborsBefore(map: MaplibreMap): string | undefined {
  return layerBeforeOf(map.getStyle()?.layers.map((l) => l.id) ?? [], 'neighbors')
}

// 選んだ筆（読み込みで選んだ筆）を、地図の塗りで選択した状態にする
function selectParcelVisual(map: MaplibreMap, uid: string) {
  const apply = () => {
    if (!map.getSource('parcels') || !map.isSourceLoaded('parcels')) return false
    map.setFeatureState({ source: 'parcels', id: uid }, { selected: true })
    return true
  }
  if (!apply()) map.once('idle', apply)
}
