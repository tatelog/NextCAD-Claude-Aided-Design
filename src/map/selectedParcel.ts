// 地図で選んだ筆の形を覚えておき、その筆の平面（mm）を店舗へ渡す（P2 の斜線・日影の基準に使う）。
// 地点（経度・緯度）を含む筆を探して選ぶ。地図の読み込みと選択（P1Map）から使う。店舗の値は画面の中だけで、保存しない。
import { useSite } from '../store/site'
import { parcelRingOf } from './parcelPlane'

// 筆の UID → 筆の形（GeoJSON の geometry）
const geometries = new Map<string, unknown>()

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

/** 地図の筆の形を覚える（筆の読み込みのとき） */
export function rememberParcelGeometry(uid: string, geometry: unknown): void {
  geometries.set(uid, geometry)
}

/** 地点（経度・緯度）を含む筆の UID。覚えている筆の中に、地点を含むものが無ければ null */
export function parcelUidAt(lon: number, lat: number): string | null {
  for (const [uid, geometry] of geometries) if (geometryContains(geometry, lon, lat)) return uid
  return null
}

/** 選んだ筆の平面を店舗へ渡す。uid が null、覚えていない、形が読めないときは null（P2 はダミーの筆に戻す） */
export function publishSelectedParcel(uid: string | null): void {
  useSite.getState().setParcel(uid === null ? null : parcelRingOf(geometries.get(uid)))
}

/** 地点から筆を選ぶ（地図の地点と、住所・座標で決めた地点の両方に使う）。地点を含む筆があればその平面を店舗へ、無ければ店舗の筆を null にする。選んだ筆の UID を返す */
export function selectParcelAt(lon: number, lat: number): string | null {
  const uid = parcelUidAt(lon, lat)
  publishSelectedParcel(uid)
  return uid
}
