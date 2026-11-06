export type SlopeVisibility = Record<'north' | 'road' | 'adjacent', boolean>
export function visibleSlopeBoundaries<T extends { kind?: 'north' | 'road' | 'adjacent' }>(boundaries: readonly T[], visibility: SlopeVisibility): T[] {
  return boundaries.filter((boundary) => boundary.kind !== undefined && visibility[boundary.kind])
}
