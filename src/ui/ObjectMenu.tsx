// 左メニューの部品（ハブ A-03 G55、D-04 共通部品「左メニュー」）。P2 の 2D 平面・P3・P4 で共通に使う。
// 種類ごとの件数の一覧と、選んだ種類の中身の欄を出す。見た目と挙動は P3 の左の帯のまま。状態は持たず、選びは呼び出し側が持つ。
import { detailOfKind, toggleKind, type ObjectDetailSources } from '../plan/objectDetail'
import { commonAreaCountsOf, commonAreaGroups } from '../plan/commonAreas'
import { countObjects, type ObjectKind } from '../plan/objectMenu'

/** 帯の幅（枠線と余白を含む）。呼び出し側の列の幅に使う。 */
export const OBJECT_MENU_WIDTH = 180

export interface ObjectMenuProps {
  /** 種類ごとの結果（件数と中身の入力）。作り方は objectSourcesOfPlan・objectSourcesOfFootprint（plan/objectSourcesOfPlan.ts） */
  sources: ObjectDetailSources
  /** 選んでいる種類。選んでいなければ null */
  selectedKind: ObjectKind | null
  /** 行を押したときに、次の選びを渡す。押した種類。選んでいる種類をもう一度押したら null（toggleKind） */
  onSelect: (next: ObjectKind | null) => void
  /** 見出しの下の説明文。省略すると「種類ごとの件数」 */
  caption?: string
  /** 説明文の下に出す注記（赤字）。省略すると出さない */
  notice?: string
  /** 1F の共用部の名前ごとの数（区画に付けた数）。省略すると、どれも 0 */
  firstFloorCounts?: { name: string; count: number }[]
}

export function ObjectMenu({ sources, selectedKind, onSelect, caption = '種類ごとの件数', notice, firstFloorCounts }: ObjectMenuProps) {
  const rows = countObjects(sources)
  const detail = selectedKind ? detailOfKind(selectedKind, sources) : null
  return (
    <aside
      style={{
        width: OBJECT_MENU_WIDTH,
        boxSizing: 'border-box',
        flex: 'none',
        padding: 12,
        borderRight: '1px solid #ddd8cc',
        background: '#fff',
        overflowY: 'auto',
      }}
    >
      <h2 style={{ fontSize: 14, margin: '0 0 4px' }}>オブジェクト</h2>
      <p style={{ fontSize: 11, color: '#666', margin: '0 0 8px' }}>{caption}</p>
      {notice ? <p style={{ fontSize: 11, color: '#a33', margin: '0 0 8px' }}>{notice}</p> : null}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13 }}>
        {rows.map((r) => (
          <li key={r.kind} style={{ borderBottom: '1px dashed #e6e4dc' }}>
            <button
              type="button"
              aria-pressed={selectedKind === r.kind}
              onClick={() => onSelect(toggleKind(selectedKind, r.kind))}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                width: '100%',
                padding: '3px 4px',
                border: 0,
                background: selectedKind === r.kind ? '#ece8da' : 'transparent',
                color: 'inherit',
                font: 'inherit',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span>{r.label}</span>
              <span>
                <strong>{r.count}</strong>
                {r.note ? <span style={{ color: '#a33', fontSize: 11, marginLeft: 4 }}>（{r.note}）</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div aria-label="共用部（グループ）" style={{ marginTop: 12, fontSize: 12, color: '#444' }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>共用部（グループ）</div>
        {commonAreaGroups().map((g) => (
          <div key={g.floor}>
            {g.floor === '基準階'
              ? `基準階：${commonAreaCountsOf(sources).map((c) => `${c.name} ${c.count}`).join('、')}`
              : `${g.floor}：${g.names.map((name) => `${name} ${firstFloorCounts?.find((c) => c.name === name)?.count ?? 0}`).join('、')}`}
          </div>
        ))}
        <div style={{ color: '#a33', fontSize: 11 }}>1F は、基準階の区画に 1F の名前を付けた数（1F 専用の平面はまだ無い）</div>
      </div>
      {detail ? (
        <section aria-label={`${detail.label}の中身`} style={{ marginTop: 12 }}>
          <h3 style={{ fontSize: 13, margin: '0 0 4px' }}>{detail.label}の中身</h3>
          {detail.emptyText ? (
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>{detail.emptyText}</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12 }}>
              {detail.entries.map((e, i) => (
                <li key={i} style={{ padding: '4px 0', borderBottom: '1px dashed #e6e4dc' }}>
                  <strong>{e.title}</strong>
                  {e.lines.map((line, j) => (
                    <div key={j} style={{ color: '#444' }}>
                      {line}
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </aside>
  )
}
