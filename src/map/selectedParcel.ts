// 地図で選んだ筆の形を覚えておき、その筆の平面（mm）を店舗へ渡す（P2 の斜線・日影の基準に使う）。
// 地点（経度・緯度）を含む筆を探して選ぶ。地図の読み込みと選択（P1Map）から使う。店舗の値は画面の中だけで、保存しない。
import { useSite } from '../store/site'
import { parcelRingOf } from './parcelPlane'
import { formatParcelInfo, type ParcelProps } from './parcelInfo'

// 筆の UID → 筆の形（GeoJSON の geometry）
const geometries = new Map<string, unknown>()
// 筆の UID → 筆の属性（選んだ筆の情報の文に使う）
const properties = new Map<string, ParcelProps>()

/** 含む筆が無いとき（と、筆の情報を覚えていない筆を選んだとき）の、選んだ筆の文 */
export const NO_PARCEL_TEXT = 'この地点を含む筆は無い（ボリュームはダミーの筆界）'

type Ring = readonly (readonly number[])[]

/** 点（経度・緯度）が輪の中にあるか（レイキャスト） */
function ringContains(ring: Ring, lon: number, lat: number): boolean {
  let inside = false
  let j = ring.length - 1
  for (let i = 0; i < ring.length; i++) {
    const [xi = 0, yi = 0] = ring[i] ?? []
    const [xj = 0, yj = 0] = ring[j] ?? []
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
    j = i
  }
  return inside
}

/** 点が多角形の中にあるか。最初の輪が外側、残りは穴（穴の中は外）。 */
function polygonContains(rings: readonly Ring[], lon: number, lat: number): boolean {
  const [outer, ...holes] = rings
  if (!outer || !ringContains(outer, lon, lat)) return false
  return !holes.some((hole) => ringContains(hole, lon, lat))
}

/** 点（経度・緯度）が GeoJSON の筆（Polygon / MultiPolygon）の中にあるか。それ以外の形は中に無いとする */
export function geometryContains(geometry: unknown, lon: number, lat: number): boolean {
  const g = geometry as { type?: unknown; coordinates?: unknown } | null | undefined
  if (!g || typeof g !== 'object') return false
  if (g.type === 'Polygon') return polygonContains(g.coordinates as Ring[], lon, lat)
  if (g.type === 'MultiPolygon') return (g.coordinates as Ring[][]).some((polygon) => polygonContains(polygon, lon, lat))
  return false
}

/** 覚えた筆の形（UID から取り出す。覚えていなければ undefined） */
export function geometryOfParcel(uid: string): unknown {
  return geometries.get(uid)
}

/** 地図の筆の形を覚える（筆の読み込みのとき） */
export function rememberParcelGeometry(uid: string, geometry: unknown, props?: ParcelProps): void {
  geometries.set(uid, geometry)
  if (props) properties.set(uid, props)
}

/** 覚えた筆の属性（地番・市区町村名など。覚えていなければ undefined）。地名地番に使う */
export function parcelPropsOf(uid: string): ParcelProps | undefined {
  return properties.get(uid)
}

/** 地点（経度・緯度）を含む筆の UID。覚えている筆の中に、地点を含むものが無ければ null */
export function parcelUidAt(lon: number, lat: number): string | null {
  for (const [uid, geometry] of geometries) if (geometryContains(geometry, lon, lat)) return uid
  return null
}

/** 選んだ筆の平面と情報の文を店舗へ渡す。uid が null、覚えていない、形が読めないときは平面を null（P2 はダミーの筆に戻す）。情報の文は、筆の情報があればその文、無ければ NO_PARCEL_TEXT */
export function publishSelectedParcel(uid: string | null): void {
  const props = uid === null ? undefined : properties.get(uid)
  useSite.getState().setParcel(uid === null ? null : parcelRingOf(geometries.get(uid)))
  useSite.getState().setParcelInfo(props ? formatParcelInfo(props) : NO_PARCEL_TEXT)
  useSite.getState().setParcelUid(uid !== null && geometries.has(uid) ? uid : null)
}

/** 地点から筆を選ぶ（地図の地点と、住所・座標で決めた地点の両方に使う）。地点を含む筆があればその平面を店舗へ、無ければ店舗の筆を null にする。選んだ筆の UID を返す */
export function selectParcelAt(lon: number, lat: number): string | null {
  const uid = parcelUidAt(lon, lat)
  publishSelectedParcel(uid)
  return uid
}
