// 共用部の名前（A-03 G75・D-04 P3「左メニュー」）。基準階と 1F で、入る共用部を決める。決定論。
// 住戸はグループではなく、共用部は住戸と同じくグループとして左の一覧に並ぶ。

export type CommonFloor = '基準階' | '1F'

interface OptionalArea {
  name: string
  /** 入れられる階。'any' は階を問わない（仕様に階の指定が無い） */
  floor: CommonFloor | 'any'
}

const REQUIRED: Record<CommonFloor, readonly string[]> = {
  基準階: ['廊下', '階段 A', '階段 B', 'EV ホール', 'EPS', 'DS'],
  '1F': ['エントランス', '風除室', 'ロビー', '管理室', 'メールコーナー', 'ゴミ置場'],
}

const OPTIONAL: readonly OptionalArea[] = [
  { name: 'ジム', floor: 'any' },
  { name: 'ゲストルーム', floor: 'any' },
  { name: '集会室', floor: '1F' },
]

/** その階の共用部の名前。必須の並びに、選んだ任意のうち、その階に入るものを後ろに足す */
export function commonAreasOf(floor: CommonFloor, optional: readonly string[] = []): string[] {
  const chosen = OPTIONAL.filter((o) => optional.includes(o.name) && (o.floor === 'any' || o.floor === floor)).map((o) => o.name)
  return [...REQUIRED[floor], ...chosen]
}

/**
 * 基準階の共用部の数（左メニュー用）。自動作成の結果から数える（ハブ A-03 G75）。
 * 廊下 = 廊下の数 / 階段 A・B と EV ホール = コアの id（stairA・stairB・evHall）/ EPS と DS = 縦シャフトの種類。
 * 名前は commonAreasOf('基準階') と同じ並び。結果が無いときは 0。
 */
export function commonAreaCountsOf(src: { corridors?: readonly unknown[]; cores?: readonly unknown[]; shafts?: readonly unknown[] }): { name: string; count: number }[] {
  const coreIds = (src.cores ?? []).map((c) => (c as { id?: unknown }).id)
  const shaftKinds = (src.shafts ?? []).map((s) => (s as { kind?: unknown }).kind)
  const coreCount = (id: string) => coreIds.filter((x) => x === id).length
  const shaftCount = (kind: string) => shaftKinds.filter((x) => x === kind).length
  return [
    { name: '廊下', count: src.corridors?.length ?? 0 },
    { name: '階段 A', count: coreCount('stairA') },
    { name: '階段 B', count: coreCount('stairB') },
    { name: 'EV ホール', count: coreCount('evHall') },
    { name: 'EPS', count: shaftCount('EPS') },
    { name: 'DS', count: shaftCount('DS') },
  ]
}

/**
 * 1F の共用部の数（区画に名前を付けた数。ハブ A-03 G75）。1F 専用の平面はまだ無いので、利用者が基準階の区画に 1F の名前を付ける。
 * 名前ごとに、その名前を付けた区画の数。1F の必須の名前だけを、仕様の並びで出す。
 */
export function firstFloorCountsOf(names: Readonly<Record<string, string>>): { name: string; count: number }[] {
  const assigned = Object.values(names)
  return commonAreasOf('1F').map((name) => ({ name, count: assigned.filter((n) => n === name).length }))
}

/** 左メニューに出す共用部のグループ（基準階・1F の順）。各階は必須の名前だけ */
export function commonAreaGroups(): { floor: CommonFloor; names: string[] }[] {
  return (['基準階', '1F'] as const).map((floor) => ({ floor, names: commonAreasOf(floor) }))
}
