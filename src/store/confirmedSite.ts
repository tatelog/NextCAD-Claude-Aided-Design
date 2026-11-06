// 確定した敷地（統括の依頼 2026-11-06。1: P1 の「この敷地で確定」）。選んだ筆・筆の中の点・枠・前面道路の辺を一つにまとめて、P2〜P5 が使う。
// 用途地域と周辺建物は、確定のときに筆の中の点で取り、ここに持つ（P1 から P2 へ移っても残る）。古い取得の結果は採らない。画面の中だけで持つ（保存は 8 で別に扱う）。
// 確定のあとに地点か筆を変えたら、「確定し直しが要る」（isConfirmedStaleOf）。
import { create } from 'zustand'
import type { Point } from '../geom/viewport'
import type { ParcelFrame } from '../map/parcelPlane'
import type { PlateauBuilding } from '../plateau/bldg'
import { loadDistrictsAt, type DistrictLoad } from '../plateau/load'
import { loadNeighborBuildings } from '../plateau/neighborBuildings'
import { createLatestGate } from '../ui/districtFetch'
import { useSite } from './site'
import { DEFAULT_ROAD_WIDTH_SOURCE, type RoadWidthSource } from '../volume/roadWidthSource'

export interface ConfirmedSite {
  planningEdge?: number
  /** 確定した筆の UID。筆が無い地点で確定したときは null（ダミーの筆界で進む） */
  parcelUid: string | null
  /** 筆の平面（mm）。null なら、ダミーの筆界を使う */
  lot: Point[] | null
  /** 筆の枠（周辺建物を同じ枠で置くため）。筆が無いときは null */
  frame: ParcelFrame | null
  /** 確定した地点（筆の中の点。筆が無いときは選んでいた地点） */
  center: { lat: number; lon: number }
  /** 前面道路の辺（P2 で決める。既定 0） */
  roadEdge: number
  /** 前面道路の幅員（mm）。ボリュームの画面で入れた値。確定のまとめに入る（統括の依頼 2026-11-06） */
  roadWidthMm: number
  /** 幅員の出どころ（数値指定・対岸指定・資料指定）。確定のまとめに入る */
  roadSource: RoadWidthSource
}

/** 取得の状態（取っている間・失敗の文・取れた結果） */
export interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

const IDLE: FetchState<never> = { data: null, loading: false, error: null }
const districtGate = createLatestGate()
const buildingsGate = createLatestGate()
const errorTextOf = (e: unknown) => (e instanceof Error ? e.message : String(e))

interface ConfirmedState {
  confirmed: ConfirmedSite | null
  /** 前面道路の辺（P2 で選ぶ。確定の前から持つ。確定すると、確定のまとめに入る。統括の依頼 2026-11-06。6） */
  roadEdge: number
  district: FetchState<DistrictLoad>
  buildings: FetchState<PlateauBuilding[]>
  confirm: (c: ConfirmedSite) => void
  clear: () => void
  setRoadEdge: (roadEdge: number) => void
  /** 前面道路の幅員（入力のままの文）。確定していれば、確定のまとめの幅員（mm）も変える */
  roadWidth: string
  roadSource: RoadWidthSource
  setRoadWidth: (text: string) => void
  setRoadSource: (source: RoadWidthSource) => void
  /** 用途地域を、その地点で取る（取り直しも同じ）。遅れて返った古い結果は採らない */
  fetchDistrictAt: (point: { lat: number; lon: number }, cityCode: string) => Promise<void>
  /** 周辺建物を、その地点で取る。遅れて返った古い結果は採らない */
  fetchBuildingsAt: (point: { lat: number; lon: number }, zipUrl: string) => Promise<void>
  /** 地点が変わったときに、用途地域の結果を捨てる（進んでいる取得も採らない） */
  resetDistrict: () => void
  /** P1 で今いる地点（確定し直しの判定に使う。P1 が更新する） */
  currentSite: { lat: number; lon: number } | null
  setCurrentSite: (site: { lat: number; lon: number } | null) => void
}

export const useConfirmedSite = create<ConfirmedState>((set, get) => ({
  confirmed: null,
  roadEdge: 0,
  roadWidth: '6000',
  roadSource: DEFAULT_ROAD_WIDTH_SOURCE,
  district: IDLE,
  buildings: IDLE,
  // 確定したときは、今いる地点も確定の中心にする（確定の処理は P1 を離れるので、P1 は今いる地点を更新できない。統括の依頼 2026-11-06。不具合の直し）
  confirm: (confirmed) => set({ confirmed, currentSite: confirmed.center }),
  clear: () => set({ confirmed: null }),
  setRoadEdge: (roadEdge) => {
    const c = get().confirmed
    set({ roadEdge, confirmed: c !== null ? { ...c, roadEdge } : null })
  },
  setRoadWidth: (text) => {
    const c = get().confirmed
    const roadWidthMm = Number(text) || 0
    set({ roadWidth: text, confirmed: c !== null ? { ...c, roadWidthMm } : null })
  },
  setRoadSource: (roadSource) => {
    const c = get().confirmed
    set({ roadSource, confirmed: c !== null ? { ...c, roadSource } : null })
  },
  fetchDistrictAt: async (point, cityCode) => {
    const id = districtGate.begin()
    set({ district: { data: null, loading: true, error: null } })
    try {
      const r = await loadDistrictsAt({ lat: point.lat, lon: point.lon, cityCode }, (url) => fetch(url))
      if (!districtGate.isLatest(id)) return
      set({ district: { data: r, loading: false, error: null } })
      useSite.getState().setMatches(r.matches)
    } catch (e) {
      if (!districtGate.isLatest(id)) return
      set({ district: { data: null, loading: false, error: errorTextOf(e) } })
    }
  },
  fetchBuildingsAt: async (point, zipUrl) => {
    const id = buildingsGate.begin()
    set({ buildings: { data: null, loading: true, error: null } })
    try {
      const list = await loadNeighborBuildings(point, zipUrl)
      if (!buildingsGate.isLatest(id)) return
      set({ buildings: { data: list, loading: false, error: null } })
      useSite.getState().setBuildings(list, point)
    } catch (e) {
      if (!buildingsGate.isLatest(id)) return
      useSite.getState().setBuildings(null, null)
      set({ buildings: { data: null, loading: false, error: errorTextOf(e) } })
    }
  },
  resetDistrict: () => {
    districtGate.begin()
    set({ district: IDLE })
  },
  currentSite: null,
  setCurrentSite: (currentSite) => set({ currentSite }),
}))

/** P1 を開き直すときの地点: 今いる地点（店舗）があればそこから。無ければ既定の地点（統括の依頼 2026-11-06。1） */
export function startSiteOf(current: { lat: number; lon: number } | null, fallback: { lat: number; lon: number }): { lat: number; lon: number } {
  return current ?? fallback
}

/** 確定した敷地の筆の平面。筆が無い確定は null（ダミーの筆界を使う） */
export function lotOfConfirmed(c: ConfirmedSite | null): Point[] | null {
  return c?.lot ?? null
}

/** 確定のあとに、地点か筆が変わったか（確定し直しが要る）。確定していなければ false */
export function isConfirmedStaleOf(c: ConfirmedSite | null, parcelUid: string | null, site: { lat: number; lon: number } | null): boolean {
  if (c === null) return false
  if (c.parcelUid !== parcelUid) return true
  if (site === null) return true
  return site.lat !== c.center.lat || site.lon !== c.center.lon
}
