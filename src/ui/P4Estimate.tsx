// P4 積算（D-04 P4、D-02 C8、A-03 G19・G21・G22・G63）。単価は利用者が出典つきの CSV で置く（G20）。
// 置き場は G72 で未決のため、ここは貼り付けの CSV を読む形にしている。数量は利用者が入れる（数量の拾い方は仮置き）。
import { useMemo, useState } from 'react'
import { estimateCost, CATEGORIES, type PriceRow } from '../estimate/estimate'
import { parsePriceCsv } from '../estimate/priceCsv'
import { effectiveQuantity } from '../estimate/autoQuantity'
import { buildingExteriorQuantities } from '../estimate/quantities'
import { useSite } from '../store/site'

const SAMPLE = [
  'id,kind,category,item,unit,unit_price,factor,source_ref,provisional,version',
  'cross,造作,内装,クロス,m2,1200,,利用者入力（出典を書く）,false,v1',
  'carpenter,労務,躯体,型枠大工,人,25000,0.3,利用者入力（出典を書く）,false,v1',
  'tile,造作,外装,外壁タイル,m2,8000,,,false,v1',
].join('\n')

const yen = (n: number) => `${n.toLocaleString('ja-JP')} 円`

export function P4Estimate() {
  const [csv, setCsv] = useState(SAMPLE)
  const [quantities, setQuantities] = useState<Record<string, string>>({})

  const parsed = useMemo<{ rows: PriceRow[] } | { error: string }>(() => {
    try {
      return { rows: parsePriceCsv(csv) }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }, [csv])

  // P2 の外形から拾った数量（外壁・屋根）。P2 で外形が閉じていれば入る
  const volume = useSite((s) => s.volume)
  // 外形の 2D（SVG は y を下へ向けるので、y を反転して表示する）
  const planBox = useMemo(() => {
    if (!volume) return { x0: 0, y0: 0, w: 1, h: 1 }
    const xs = volume.footprint.map((p) => p.x)
    const ys = volume.footprint.map((p) => -p.y)
    const pad = 1_000
    const x0 = Math.min(...xs) - pad
    const y0 = Math.min(...ys) - pad
    return { x0, y0, w: Math.max(...xs) - x0 + pad, h: Math.max(...ys) - y0 + pad }
  }, [volume])
  const autoList = useMemo(() => {
    if (!volume) return []
    const q = buildingExteriorQuantities(volume.footprint, { storey_count: volume.storey_count, storey_height: volume.storey_height })
    return [
      { item: q.exterior_wall.item, quantity: q.exterior_wall.quantity },
      { item: q.roof.item, quantity: q.roof.quantity },
    ]
  }, [volume])

  const estimate = useMemo(() => {
    if (!('rows' in parsed)) return null
    const lines = parsed.rows
      .map((r) => ({ price_id: r.id, quantity: effectiveQuantity(r, quantities[r.id] ?? '', autoList)?.quantity ?? NaN }))
      .filter((l) => Number.isFinite(l.quantity) && l.quantity > 0)
    try {
      return estimateCost(parsed.rows, lines)
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) } as const
    }
  }, [parsed, quantities, autoList])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', height: '100%' }}>
      <div style={{ padding: 16, overflow: 'auto' }}>
        <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>P4 積算 — 単価と数量</h2>
        {volume ? (
          <figure style={{ margin: '0 0 12px' }}>
            <svg viewBox={`${planBox.x0} ${planBox.y0} ${planBox.w} ${planBox.h}`} style={{ width: '100%', maxWidth: 420, background: '#fbfbf8', border: '1px solid #ddd8cc' }}>
              <polygon points={volume.footprint.map((p) => `${p.x},${-p.y}`).join(' ')} fill="rgba(47,122,79,0.12)" stroke="#2f7a4f" strokeWidth={planBox.w / 160} />
            </svg>
            <figcaption style={{ fontSize: 12, color: '#666' }}>
              外形（P2）。外壁と屋根は外装として拾う。室の内装の塗り分けは、P3 で部屋を作ってから出す（未実装）。
            </figcaption>
          </figure>
        ) : (
          <p style={{ fontSize: 12, color: '#666' }}>P2 で外形を閉じると、外壁と屋根の数量を自動で拾います。</p>
        )}
        <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={8} style={{ width: '100%', fontFamily: 'monospace' }} />
        {'error' in parsed ? (
          <p style={{ color: '#a33' }}>単価 CSV: {parsed.error}</p>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 12 }}>
            <thead>
              <tr>
                <th align="left">品目</th>
                <th align="left">区分</th>
                <th align="right">単価</th>
                <th align="left">出典</th>
                <th align="right">数量</th>
              </tr>
            </thead>
            <tbody>
              {parsed.rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.item}</td>
                  <td>{r.category}</td>
                  <td align="right">{r.unit_price.toLocaleString('ja-JP')} 円/{r.unit}</td>
                  <td>{r.source_ref.trim() === '' || r.provisional ? '未確定（出典なし）' : r.source_ref}</td>
                  <td align="right">
                    <input
                      value={quantities[r.id] ?? ''}
                      onChange={(e) => setQuantities({ ...quantities, [r.id]: e.target.value })}
                      style={{ width: 90, textAlign: 'right' }}
                    />
                    {(() => {
                      const eq = effectiveQuantity(r, quantities[r.id] ?? '', autoList)
                      return eq && eq.source === '自動' ? <span style={{ marginLeft: 6, fontSize: 11, color: '#2f7a4f' }}>自動 {Math.round(eq.quantity).toLocaleString('ja-JP')} m²</span> : null
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <aside style={{ padding: 12, borderLeft: '1px solid #ddd8cc', background: '#fff', overflowY: 'auto' }}>
        <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>工事原価（概算）</h3>
        {estimate && !('error' in estimate) ? (
          <>
            <p style={{ fontSize: 20, margin: '0 0 8px' }}>
              {yen(estimate.total_yen)}
              {estimate.provisional && <span style={{ color: '#a33', fontSize: 12 }}> 未確定を含む</span>}
            </p>
            <table style={{ width: '100%' }}>
              <tbody>
                {CATEGORIES.map((c) => (
                  <tr key={c}>
                    <td>{c}</td>
                    <td align="right">
                      {yen(estimate.subtotals[c].yen)}
                      {estimate.subtotals[c].provisional ? ' ※' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ color: '#666', fontSize: 12 }}>直接仮設・共通仮設費・現場管理費・一般管理費は含めない（G19）。円単位の概算（G21）。</p>
          </>
        ) : (
          <p style={{ color: '#a33' }}>{estimate && 'error' in estimate ? estimate.error : '—'}</p>
        )}
        <h3 style={{ fontSize: 14, margin: '12px 0 4px' }}>未決</h3>
        <ul style={{ margin: 0, paddingLeft: 18, color: '#666', fontSize: 12 }}>
          <li>単価の置き場（G72、代表の答え待ち）</li>
          <li>ユニットバス・什器の歩掛（出典なし。G22）</li>
          <li>数量の拾い方は仮置き（D-02 C8）</li>
        </ul>
      </aside>
    </div>
  )
}
