// 地図の層を、基準の層の前に足す。基準の層がまだ地図に無ければ、基準を付けずに足す（統括の依頼 2026-11-06。3）。
/** 基準の層（wanted）が地図の層の中にあれば、その id を返す。無ければ undefined（前に置かず、末尾に足す） */
export function layerBeforeOf(existingLayerIds: readonly string[], wanted: string): string | undefined {
  return existingLayerIds.includes(wanted) ? wanted : undefined
}
