// 住戸タイプのマスタ（ハブ A-03 G89・G91、D-03 T-08）。候補（unitTypeCandidates.json）を D-03 の列に合わせて持つ。決定論。
// 出典の無い値は null（未確認）にし、未確認の値を持つ行は provisional（仮置きの印）を立てる。
// 割付は縦割り（柱割りの列）単位。列ごとに 1 タイプ（G89）。

/** 住戸タイプの行（D-03 T-08 の列。候補に無い列は null で持つ） */
export interface UnitType {
  /** 型の id（T-08-2LDK など） */
  id: string
  /** 型名（2LDK など） */
  name: string
  /** ファミリー向けか単独世帯向けか。候補に無いので未確認（null） */
  target: 'ファミリー向け' | '単独世帯向け' | null
  /** 室数（個室の数） */
  room_count: number
  /** 部屋の構成（LDK・個室2・洗面浴室 など）。未確認の型は型名から仮定した構成 */
  room_types: string[]
  /** 最小面積（m²）。面積帯の下限。未確認は null */
  min_area: number | null
  /** 件数（分譲）。出典の無いものは null */
  count_sold: number | null
  /** 自作案の専有面積（m²）。無いものは null */
  sample_area_m2: number | null
  /** LDK の有無（1 なら LDK あり） */
  ldk: number
  /** 個室の数 */
  bedrooms: number
  /** 未確認の列の名前（target・room_types など） */
  unconfirmed: string[]
  /** 仮置きの印（未確認の値を持つ、または候補の状態が未確認） */
  provisional: boolean
  /** 出典（候補の出典の文） */
  source: string[]
}

/** 候補の JSON（unitTypeCandidates.json）の型 */
interface RawCandidates {
  types: Record<string, unknown>[]
}

/** 候補の JSON から、D-03 T-08 の行を作る */
export function masterOf(raw: RawCandidates): UnitType[] {
  return raw.types.map((r) => {
    const unconfirmed: string[] = ['target']
    const partsText = r['部屋構成'] === '未確認' || r['部屋構成'] === undefined ? null : (r['部屋構成'] as string)
    const assumedText = (r['部屋構成_仮定'] as string | undefined) ?? null
    // 仮定の構成には「（型名から…）」の注記が付くので、注記の前だけを使う
    const roomsText = (partsText ?? assumedText)?.split('（')[0] ?? null
    if (partsText === null) unconfirmed.push('room_types')
    const area = r['面積帯_m2']
    const areaMatch = typeof area === 'string' ? /^(\d+(?:\.\d+)?)/.exec(area) : null
    const minArea = areaMatch ? Number(areaMatch[1]) : null
    if (minArea === null || (typeof area === 'string' && area.includes('候補'))) unconfirmed.push('min_area')
    const sold = typeof r['件数_分譲'] === 'number' ? (r['件数_分譲'] as number) : null
    if (sold === null) unconfirmed.push('count_sold')
    const sample = typeof r['自作案_専有_m2'] === 'number' ? (r['自作案_専有_m2'] as number) : null
    const status = String(r['status'] ?? '')
    return {
      id: String(r['id']),
      name: String(r['type_name']),
      target: null,
      room_count: Number(r['bedrooms']),
      room_types: roomsText ? roomsText.split('・') : [],
      min_area: minArea,
      count_sold: sold,
      sample_area_m2: sample,
      ldk: Number(r['ldk']),
      bedrooms: Number(r['bedrooms']),
      unconfirmed,
      provisional: unconfirmed.length > 0 || status.includes('未確認'),
      source: (r['出典'] as string[] | undefined) ?? [],
    }
  })
}

/** P3 の住戸タイプの選択肢（値は id、表示は型名） */
export function unitTypeOptions(master: readonly UnitType[]): { value: string; label: string }[] {
  return master.map((t) => ({ value: t.id, label: t.name }))
}

/** 自動作成の部屋割りに渡す区分。1R・1K（LDK なし・個室 1）は単独、それ以外はファミリー（仮定。統括が確認する） */
export function unitTypeKind(t: UnitType): 'ファミリー' | '単独' {
  return t.ldk === 0 && t.bedrooms === 1 ? '単独' : 'ファミリー'
}

/** 縦割り（柱割りの列）ごとに型の id を割り付ける。型が少なければ繰り返す。型が無ければ null（G89） */
export function assignTypesToSpans(spans: number, typeIds: readonly string[]): (string | null)[] {
  return Array.from({ length: spans }, (_, i) => (typeIds.length === 0 ? null : typeIds[i % typeIds.length]!))
}
