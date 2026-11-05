// 敷地からの離れの既定値（ハブ A-03 G104・G115、D-02 C4 の仮置き。G115 で代表が委任、A-07 E-89 で裏取り済み）。決定論。
// 隣地境界は 500 mm（江東区マンション条例 14 条と規則 10 条の努力義務、民法 234 条の 50 cm）。道路境界は 0 mm。
// 地区計画の壁面の位置の制限がある敷地は、設定値で既定を上書きする（今は地区計画の値を持たない）。
// 離れは辺ごとに測る（G104）。前面道路の辺は道路境界、それ以外の辺は隣地境界として扱う。

export const NEIGHBOR_SETBACK_DEFAULT_MM = 500
export const ROAD_SETBACK_DEFAULT_MM = 0

type Pt = { x: number; y: number }

export interface SetbackOverrides {
  /** 隣地境界の既定（地区計画の値などで上書きする） */
  neighborMm?: number
  /** 道路境界の既定（地区計画の値などで上書きする） */
  roadMm?: number
}

/** 辺の種類（前面道路か、隣地か）から、離れの既定を出す */
export function setbackDefaultOf(isRoad: boolean, overrides: SetbackOverrides = {}): number {
  return isRoad ? (overrides.roadMm ?? ROAD_SETBACK_DEFAULT_MM) : (overrides.neighborMm ?? NEIGHBOR_SETBACK_DEFAULT_MM)
}

/** 前面道路の辺（幅員の大きい道路）。同じ幅員なら先の道路。道路が無ければ null（G115） */
export function frontRoadEdgeOf(roads: readonly { edge: number; widthMm: number }[]): number | null {
  if (roads.length === 0) return null
  return roads.reduce((best, r) => (r.widthMm > best.widthMm ? r : best)).edge
}

/** 辺がすべて軸に平行な四角形か（長方形の敷地。離れは長方形の敷地でだけ定める） */
function isAxisRectParcel(parcel: readonly Pt[]): boolean {
  if (parcel.length !== 4) return false
  return parcel.every((a, i) => {
    const b = parcel[(i + 1) % parcel.length]!
    return a.x === b.x || a.y === b.y
  })
}

/** 条件に当たる辺の番号（辺 i は頂点 i から頂点 i+1）。無ければ null */
function edgeWhere(parcel: readonly Pt[], pred: (a: Pt, b: Pt) => boolean): number | null {
  for (let i = 0; i < parcel.length; i++) {
    if (pred(parcel[i]!, parcel[(i + 1) % parcel.length]!)) return i
  }
  return null
}

/**
 * 西と南の離れの初期値（mm）。前面道路の辺（roadEdge）が西なら西は 0、南なら南は 0、それ以外は 500（上書きがあればそれ）。
 * 長方形でない敷地は null（入力欄は空のまま。描いた位置のまま置く）。
 */
export function setbackInitialOf(parcel: readonly Pt[], roadEdge: number, overrides: SetbackOverrides = {}): { westMm: number; southMm: number } | null {
  if (!isAxisRectParcel(parcel)) return null
  const minX = Math.min(...parcel.map((p) => p.x))
  const minY = Math.min(...parcel.map((p) => p.y))
  const westEdge = edgeWhere(parcel, (a, b) => a.x === minX && b.x === minX)
  const southEdge = edgeWhere(parcel, (a, b) => a.y === minY && b.y === minY)
  if (westEdge === null || southEdge === null) return null
  return {
    westMm: setbackDefaultOf(roadEdge === westEdge, overrides),
    southMm: setbackDefaultOf(roadEdge === southEdge, overrides),
  }
}
