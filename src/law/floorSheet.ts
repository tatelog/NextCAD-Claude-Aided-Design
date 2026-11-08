// 第五面（用途別床面積）の枚数（統括の決定 2026-11-06。B）: 5〜8 欄の内容が同じ階を 1 枚にまとめ、2 欄に階を列記する。決定論。
// 最初のまとまり（最も下の階を含むもの）だけを書き、残りの階のまとまりは空欄の一覧に「第五面は階ごとに別紙」と出す（docx の面は増やさない）。

export interface FloorArea {
  floor: number
  /** 床面積（書く文字。同じ文字なら内容が同じ） */
  area: string
}

export interface FloorGroup {
  floors: number[]
  label: string
}

export interface FloorSheet {
  /** 最初のまとまり（最も下の階を含む）。階が無ければ null */
  first: (FloorGroup & { area: string }) | null
  /** 残りのまとまり（内容の違う階） */
  rest: FloorGroup[]
}

/** 階の列記（「1階〜5階」「1階、3階」「1階、3階〜5階」）。階は昇順・重複なし */
export function floorsLabelOf(floors: readonly number[]): string {
  const runs: [number, number][] = []
  for (const f of floors) {
    const last = runs[runs.length - 1]
    if (last !== undefined && f === last[1] + 1) last[1] = f
    else runs.push([f, f])
  }
  return runs.map(([a, b]) => (a === b ? `${a}階` : `${a}階〜${b}階`)).join('、')
}

/** 階ごとの床面積から、第五面のまとまりを作る（同じ床面積の階を 1 枚に。最も下の階を含むまとまりが最初） */
export function floorSheetOf(areas: readonly FloorArea[]): FloorSheet {
  if (areas.length === 0) return { first: null, rest: [] }
  const sorted = [...areas].sort((a, b) => a.floor - b.floor)
  const firstArea = sorted[0]!.area
  const groups = new Map<string, number[]>()
  for (const { floor, area } of sorted) groups.set(area, [...(groups.get(area) ?? []), floor])
  const firstFloors = groups.get(firstArea) ?? []
  const rest: FloorGroup[] = [...groups.entries()]
    .filter(([area]) => area !== firstArea)
    .map(([, floors]) => ({ floors, label: floorsLabelOf(floors) }))
  return { first: { floors: firstFloors, area: firstArea, label: floorsLabelOf(firstFloors) }, rest }
}

/** 残りの階の別紙の一行（空欄の一覧に出す）。残りが無ければ null */
export function floorSheetRestNoteOf(rest: readonly FloorGroup[]): string | null {
  if (rest.length === 0) return null
  return `第五面は階ごとに別紙（内容の違う階: ${rest.map((r) => r.label).join('、')}）`
}
