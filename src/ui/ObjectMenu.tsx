// 左メニューの部品（ハブ A-03 G55、D-04 共通部品「左メニュー」）。P2 の 2D 平面・P3・P4 で共通に使う。
// 種類ごとの件数の一覧と、選んだ種類の中身の欄を出す。見た目と挙動は P3 の左の帯のまま。状態は持たず、選びと開閉は呼び出し側が持つ。
import { detailOfKind, toggleKind, type ObjectDetailSources } from '../plan/objectDetail'
import { commonAreaCountsOf, commonAreaGroups } from '../plan/commonAreas'
import { countObjects, type ObjectKind, type ObjectSources } from '../plan/objectMenu'
import type { ObjectRow } from '../plan/objectTable'
import { unitGroupSummary } from '../plan/unitGroupSummary'

/** 帯の幅（枠線と余白を含む）。呼び出し側の列の幅に使う。 */
export const OBJECT_MENU_WIDTH = 180

/** 折りたたんだときの帯の幅（開閉のボタンだけを出す。G55）。 */
export const OBJECT_MENU_FOLDED_WIDTH = 28

/** 帯の幅（開いているか、折りたたんでいるか）。呼び出し側の列の幅に使う。 */
export function objectMenuWidthOf(folded: boolean): number {
  return folded ? OBJECT_MENU_FOLDED_WIDTH : OBJECT_MENU_WIDTH
}

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
  /** オブジェクト表の行（plan/objectTable）。あれば住戸をグループとして数える（G58）。省略すると出さない */
  objectRows?: readonly ObjectRow[]
  /** 左の一覧の件数の入力（オブジェクト表の行から作る。G78）。省略すると sources から数える */
  countSources?: ObjectSources
  /** 折りたたんでいるか（G55）。省略すると開いている */
  folded?: boolean
  /** 開閉のボタンを押したとき。渡したときだけ開閉のボタンを出す（呼び出し側が folded を切り替える） */
  onToggleFold?: () => void
}

export function ObjectMenu({
  sources,
  selectedKind,
  onSelect,
  caption = '種類ごとの件数',
  notice,
  firstFloorCounts,
  objectRows,
  countSources,
  folded = false,
  onToggleFold,
}: ObjectMenuProps) {
  const rows = countObjects(countSources ?? sources)
  const detail = selectedKind ? detailOfKind(selectedKind, sources) : null
  const groupSummary = objectRows ? unitGroupSummary(objectRows) : null
  const frame = {
    width: objectMenuWidthOf(folded),
    boxSizing: 'border-box' as const,
    flex: 'none',
    padding: folded ? 4 : 12,
    borderRight: '1px solid #ddd8cc',
    background: '#fff',
    overflowY: 'auto' as const,
  }
  // 開閉のボタン（G55）。どのモードでも押せる。渡されていなければ出さない
  const toggle = onToggleFold ? (
    <button
      type="button"
      aria-expanded={!folded}
      aria-label={folded ? 'オブジェクトを開く' : 'オブジェクトを閉じる'}
      onClick={onToggleFold}
      style={{ font: 'inherit', padding: '0 2px', border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer' }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d={folded ? 'M4 2 L8 6 L4 10' : 'M2 4 L6 8 L10 4'} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  ) : null
  if (folded) return <aside style={frame}>{toggle}</aside>
  return (
    <aside style={frame}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <h2 style={{ fontSize: 14, margin: '0 0 4px' }}>オブジェクト</h2>
        {toggle}
      </div>
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
      {groupSummary ? (
        <div aria-label="住戸（グループ）" style={{ marginTop: 12, fontSize: 12, color: '#444' }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>住戸（グループ）</div>
          <div>{`${groupSummary.units} 戸。中身: 部屋 ${groupSummary.rooms}・PS ${groupSummary.shafts}・置いた什器 ${groupSummary.fixtures}`}</div>
        </div>
      ) : null}
      <div aria-label="共用部（グループ）" style={{ marginTop: 12, fontSize: 12, color: '#444' }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>共用部（グループ）</div>
        {commonAreaGroups().map((g) => (
          <div key={g.floor}>
            {g.floor === '基準階'
              ? `基準階：${commonAreaCountsOf(sources).map((c) => `${c.name} ${c.count}`).join('、')}`
              : `${g.floor}：${g.names.map((name) => `${name} ${firstFloorCounts?.find((c) => c.name === name)?.count ?? 0}`).join('、')}`}
          </div>
        ))}
        <div style={{ color: '#a33', fontSize: 11 }}>1F は、基準階の区画に 1F の名前を付けた数</div>
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
