// 周辺建物の輪郭を、地図に重ねる環（[経度, 緯度] の点の列）にする。表示しないときは空。
export type NeighborBuildingLike = { footprints: { lon: number; lat: number }[][] }

export function neighborRings(buildings: NeighborBuildingLike[] | null, show: boolean): [number, number][][] {
  if (!buildings || !show) return []
  return buildings.flatMap((b) => b.footprints.map((ring) => ring.map((p) => [p.lon, p.lat] as [number, number])))
}
