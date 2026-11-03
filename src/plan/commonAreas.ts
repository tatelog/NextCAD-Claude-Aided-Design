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
