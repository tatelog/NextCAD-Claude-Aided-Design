// 住戸の詳細パネル（ハブ A-03 G76）。P3 の図面で住戸をダブルクリックすると、右から出る。中身は plan/unitDetail の結果。
// 操作は二つ。「この住戸を直す（P3 に戻る）」は閉じるだけ（描き直しは図面で行う）。「同タイプの住戸に反映」は未配線（住戸タイプの持ち方が未決）。
import type { UnitDetail } from '../plan/unitDetail'

export interface UnitDetailPanelProps {
  /** 選んだ住戸の詳細。無ければ何も出さない */
  detail: UnitDetail | null
  onClose: () => void
  /** 階数（基準階を何階に複製するか）。無ければ未配線と出す */
  storeyCount?: number
  /** 天井高（mm。仮置き）。無ければ未配線と出す */
  ceilingMm?: number
  /** 区画の部屋の種類 */
  rooms?: string[]
  /** 描いた線のうち、区画の中の壁の本数と開口の数（意味づけの結果）。無ければ未配線と出す */
  walls?: number
  openings?: number
  /** 同じ間口・奥行の住戸の ID。無ければ「同タイプの住戸に反映」は押せない */
  sameTypeIds: string[]
  /** 「同タイプの住戸に反映」を押したとき（この住戸の什器を同タイプへ） */
  onApplySameType: () => void
}

const listOrNone = (items: readonly string[]) => (items.length > 0 ? items.join('、') : 'なし')

export function UnitDetailPanel({ detail, onClose, storeyCount, ceilingMm, rooms = [], walls, openings, sameTypeIds, onApplySameType }: UnitDetailPanelProps) {
  if (!detail) return null
  return (
    <aside
      aria-label="住戸の詳細"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 300,
        boxSizing: 'border-box',
        padding: 12,
        background: '#fff',
        borderLeft: '1px solid #ddd8cc',
        boxShadow: '-4px 0 12px rgba(0,0,0,0.12)',
        overflowY: 'auto',
        zIndex: 40,
      }}
    >
      <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>{`住戸 ${detail.id}`}</h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px', fontSize: 13 }}>
        <li>{`間口 ${detail.frontageMm} mm`}</li>
        <li>{`奥行 ${detail.depthMm} mm`}</li>
        <li>{`専有面積 ${detail.areaM2.toFixed(2)} m²`}</li>
        <li>{`隣戸 ${listOrNone(detail.neighbors)}`}</li>
        <li>{`廊下側 ${listOrNone(detail.corridorSides)}`}</li>
        <li>{`外側 ${listOrNone(detail.outerSides)}`}</li>
        <li>{`置いた什器 ${listOrNone(detail.fixtures)}`}</li>
        <li>{`部屋 ${listOrNone(rooms)}`}</li>
        <li>{storeyCount === undefined ? '配置（階）: 未配線' : `配置（階）: 基準階（${storeyCount} 階に複製）`}</li>
        <li>{ceilingMm === undefined ? '天井高: 未配線' : `天井高 ${ceilingMm} mm（仮置き）`}</li>
      </ul>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px', fontSize: 12, color: '#a33' }}>
        <li>バルコニー: 未配線</li>
        <li>{walls === undefined || openings === undefined ? '壁と開口: 未配線' : `壁 ${walls} 本・開口 ${openings} 箇所（描いた線から）`}</li>
      </ul>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button type="button" onClick={onClose}>
          この住戸を直す（P3 に戻る）
        </button>
        <button
          type="button"
          disabled={sameTypeIds.length === 0}
          title={sameTypeIds.length === 0 ? '同じ間口・奥行の住戸が無い' : `同タイプ: ${sameTypeIds.join('、')}`}
          onClick={onApplySameType}
        >
          同タイプの住戸に反映
        </button>
      </div>
    </aside>
  )
}
