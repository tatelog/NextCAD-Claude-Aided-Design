// 什器の欄（ハブ A-03 G69、D-04 P2・P3）。P3 で使う道具。5 品目のボタンを並べ、選んだ品目を呼び出し側に返す。
// 選んでいるときに平面の区画を押すと、その区画に置く（区画の押しは FixtureLayer が受け、置くのは呼び出し側）。
// 置いた什器の一覧（外すボタン付き）と、種類ごとの件数を出す。状態は持たず、選びは呼び出し側が持つ。文言は仮置き。
import { FIXTURE_ITEMS, countFixtures, fixtureLabel, type Fixture, type FixtureItem } from '../plan/fixtures'
import { isToolEnabled } from './toolAvailability'
import { ToolIcon } from './toolIcons'

export interface FixturePaletteProps {
  /** 選んでいる品目。選んでいなければ null */
  selectedItem: FixtureItem | null
  /** ボタンを押したときに、次の選びを渡す。押した品目。選んでいる品目をもう一度押したら null */
  onSelect: (next: FixtureItem | null) => void
  /** 置いた什器（置いた順） */
  fixtures: readonly Fixture[]
  /** いま P3 にある区画の id。この中に無い区画の什器は「区画なし」に数える */
  unitIds: readonly string[]
  /** 「外す」を押したときに、その什器の id を渡す */
  onRemove: (id: string) => void
}

// 什器は P3 で使う道具（G69）。使えない画面では押せなくする
const ENABLED = isToolEnabled('fixture', 'P3')

const heading = { fontSize: 12, margin: '8px 0 4px' } as const
const list = { listStyle: 'none', padding: 0, margin: 0, fontSize: 12 } as const
const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '2px 0', borderBottom: '1px dashed #e6e4dc' } as const
const itemButton = (pressed: boolean) =>
  ({
    font: 'inherit',
    fontSize: 12,
    padding: '4px 8px',
    border: '1px solid #b8b2a4',
    borderRadius: 6,
    background: pressed ? '#1f2a44' : '#fff',
    color: pressed ? '#fff' : '#1f2a44',
    cursor: 'pointer',
  }) as const
const removeButton = { font: 'inherit', fontSize: 11, padding: '1px 6px', border: '1px solid #b8b2a4', borderRadius: 4, background: '#fff', color: '#a33', cursor: 'pointer' } as const

export function FixturePalette({ selectedItem, onSelect, fixtures, unitIds, onRemove }: FixturePaletteProps) {
  const counts = countFixtures(fixtures, unitIds)
  const hasUnit = (f: Fixture) => f.unitId !== null && unitIds.includes(f.unitId)
  return (
    <fieldset style={{ border: '1px solid #ddd8cc', padding: 8, margin: '0 0 10px' }}>
      <legend style={{ fontSize: 12 }}>
        <ToolIcon name="fixture" style={{ verticalAlign: 'middle', marginRight: 4 }} />
        什器
      </legend>
      <p style={{ color: '#666', fontSize: 12, margin: '0 0 6px' }}>
        品目を選んでから平面の区画を押すと、その区画の中央に置く（仮置き）。選んでいる品目をもう一度押すと外れる。
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '0 0 6px' }}>
        {FIXTURE_ITEMS.map((i) => (
          <button
            key={i.id}
            type="button"
            disabled={!ENABLED}
            aria-pressed={selectedItem === i.id}
            onClick={() => onSelect(selectedItem === i.id ? null : i.id)}
            style={itemButton(selectedItem === i.id)}
          >
            {i.label}
          </button>
        ))}
      </div>
      <h3 style={heading}>置いた什器</h3>
      {fixtures.length === 0 ? (
        <p style={{ color: '#666', fontSize: 12, margin: 0 }}>まだ置いていません</p>
      ) : (
        <ul aria-label="置いた什器" style={list}>
          {fixtures.map((f) => (
            <li key={f.id} style={row}>
              <span>
                {fixtureLabel(f.item)}（{hasUnit(f) ? `区画 ${f.unitId}` : '区画なし'}）
              </span>
              <button type="button" aria-label={`${fixtureLabel(f.item)}を外す`} onClick={() => onRemove(f.id)} style={removeButton}>
                外す
              </button>
            </li>
          ))}
        </ul>
      )}
      <h3 style={heading}>什器の種類ごとの件数</h3>
      <ul aria-label="什器の種類ごとの件数" style={list}>
        {FIXTURE_ITEMS.map((i) => (
          <li key={i.id}>
            {i.label} {counts.byItem[i.id]} 台
          </li>
        ))}
        {counts.unassigned > 0 ? <li>区画なし {counts.unassigned} 台</li> : null}
      </ul>
    </fieldset>
  )
}
