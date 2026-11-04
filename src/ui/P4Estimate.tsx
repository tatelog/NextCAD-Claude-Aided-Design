// P4 積算（D-04 P4、D-02 C8、A-03 G19・G21・G22・G63）。単価は利用者が出典つきの CSV で置く（G20）。
// 置き場は G72 で未決のため、ここは貼り付けの CSV を読む形にしている。数量は利用者が入れる（数量の拾い方は仮置き）。
import { useMemo, useState } from 'react'
import { estimateCost, CATEGORIES, type PriceRow } from '../estimate/estimate'
import { parsePriceCsv } from '../estimate/priceCsv'
import { effectiveQuantity } from '../estimate/autoQuantity'
import { estimateFixtureCost, fixtureCostLines, parseUnitPrices } from '../estimate/fixtureCost'
import { buildingExteriorQuantities } from '../estimate/quantities'
import { planExteriorQuantities, railingQuantity } from '../estimate/planExterior'
import { structureQuantities } from '../estimate/structureQuantities'
import { sashQuantity } from '../estimate/sashQuantity'
import { objectTableOf } from '../plan/objectTable'
import { useDrawing } from '../store/drawing'
import { useSemantic } from '../store/semantic'
import { roomFinishTotals } from '../estimate/roomQuantities'
import { breakdownByUnitType, roomsByUnit } from '../estimate/unitTypeBreakdown'
import type { ObjectKind } from '../plan/objectMenu'
import { noticeOfPlan, objectSourcesOfPlan } from '../plan/objectSourcesOfPlan'
import type { RoomKind } from '../plan/rooms'
import { useFixtures } from '../store/fixtures'
import { useSite } from '../store/site'
import { FixtureLayer } from './FixtureLayer'
import { FixtureSummary } from './FixtureSummary'
import { OBJECT_MENU_WIDTH, ObjectMenu } from './ObjectMenu'

const SAMPLE = [
  'id,kind,category,item,unit,unit_price,factor,source_ref,provisional,version',
  'cross,造作,内装,壁クロス,m2,1200,,利用者入力（出典を書く）,false,v1',
  'carpenter,労務,躯体,型枠大工,人,25000,0.3,利用者入力（出典を書く）,false,v1',
  'tile,造作,外装,外壁タイル,m2,8000,,,false,v1',
].join('\n')

const yen = (n: number) => `${n.toLocaleString('ja-JP')} 円`
// P4 の平面の什器の印は読み取りのみ（押しても置かず、外さない）。FixtureLayer の押しのハンドラは必須なので、何もしない関数を渡す
const NO_OP = () => undefined
// 天井高（仮置き）。階高から天井の仕上げを引く値は未決のため、ここは固定の仮置き
const CEILING_MM = 2400
// 区分の並び（モックの P4: 躯体・外装・内装・外構）。躯体と外構は数量をまだ拾えない
const CATEGORY_ORDER = ['躯体', '外装', '内装', '外構'] as const
// 部屋の種類ごとの色（2D の塗り分け）
const ROOM_FILL: Record<RoomKind, string> = {
  LDK: 'rgba(31,95,139,0.22)',
  洋室: 'rgba(122,136,96,0.18)',
  水回り: 'rgba(90,102,112,0.35)',
}

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
  // 自動で拾う数量: 外装（P2 の外形）と内装（P3 の部屋。天井高は仮置き）。種類（区分）を付けて内訳に使う
  const plan = useSite((s) => s.plan)
  // サッシ（G62）: 描いた線のうち、種類が開口の線の長さから拾う（高さは仮置き）
  const drawnEntries = useDrawing((s) => s.entries)
  const assignments = useSemantic((s) => s.assignments)
  // 什器（G69）: P3 で置いたもの。品目ごとに単価（円/台）を入れると、台数 × 単価を工事原価の合計に入れる（出典なしの仮置き。空欄の品目は入れない）
  const fixtures = useFixtures((s) => s.fixtures)
  const fixtureUnitIds = useFixtures((s) => s.unitIds)
  const fixtureUnitPriceTexts = useFixtures((s) => s.unitPriceTexts)
  const setFixtureUnitPriceText = useFixtures((s) => s.setUnitPriceText)
  // 工事原価（概算）に渡す什器の行（単価を入れて、1 台以上置いた品目。区分は内装）
  const fixtureAmountLines = useMemo(
    () => fixtureCostLines(estimateFixtureCost(fixtures, parseUnitPrices(fixtureUnitPriceTexts))),
    [fixtures, fixtureUnitPriceTexts],
  )
  const autoQuantities = useMemo(() => {
    const out: { item: string; category: string; quantity: number; unit: string }[] = []
    if (volume) {
      const q = buildingExteriorQuantities(volume.footprint, { storey_count: volume.storey_count, storey_height: volume.storey_height })
      out.push(q.exterior_wall, q.roof)
      // 躯体のうち床版の面積（G63）。厚さの拾い方は未決なので、面積だけ
      const structure = structureQuantities(volume.footprint, { storey_count: volume.storey_count, storey_height: volume.storey_height })
      out.push(structure.slab, structure.formwork, structure.concrete, structure.rebar)
    }
    if (plan) {
      const t = roomFinishTotals(plan.rooms, { storeyCount: plan.ev.storey_count, ceilingHeightMm: CEILING_MM })
      out.push(t.floor, t.ceiling, t.wall_cloth)
      // バルコニーと共用廊下（G62）。基準階の区画・廊下・コアから、階数分を拾う（仮置き）
      const ext = planExteriorQuantities({
        corridor: plan.corridor,
        cores: plan.cores,
        cells: plan.cells,
        outline: { W: plan.widthMm, D: plan.depthMm },
        storeyCount: plan.ev.storey_count,
      })
      out.push(ext.balcony, ext.corridor)
      // 手すり（G62）。バルコニーの付く面の辺の長さ × 高さ（仮置き）
      out.push(railingQuantity({ cells: plan.cells, outline: { W: plan.widthMm, D: plan.depthMm }, storeyCount: plan.ev.storey_count }))
    }
    out.push(sashQuantity(drawnEntries.flatMap((e) => e.segments), (id) => assignments[id]?.kind ?? null))
    return out
  }, [volume, plan, drawnEntries, assignments])
  const autoList = useMemo(() => autoQuantities.map((q) => ({ item: q.item, quantity: q.quantity })), [autoQuantities])

  // 左メニュー（G55）: P3 の自動作成の結果（plan）から、種類ごとの件数と、選んだ種類の中身を出す。自動作成の前は全部 0 で、注記を付ける
  // 什器（G69）は自動作成の結果ではなく店舗のもの（P3 で置いた什器。下の什器の欄と同じ値）なので、自動作成の前でも件数を出す
  const [selectedKind, setSelectedKind] = useState<ObjectKind | null>(null)
  const objectSources = useMemo(() => objectSourcesOfPlan(plan, fixtures), [plan, fixtures])
  // 住戸をグループとして数える（G58）。自動作成の結果から、オブジェクト表の行を作る
  const objectRows = useMemo(
    () =>
      plan
        ? objectTableOf({ cells: plan.cells, rooms: plan.rooms, shafts: plan.shaftRects, cores: plan.cores, corridor: plan.corridor, fixtures })
        : [],
    [plan, fixtures],
  )

  const estimate = useMemo(() => {
    if (!('rows' in parsed)) return null
    const lines = parsed.rows
      .map((r) => ({ price_id: r.id, quantity: effectiveQuantity(r, quantities[r.id] ?? '', autoList)?.quantity ?? NaN }))
      .filter((l) => Number.isFinite(l.quantity) && l.quantity > 0)
    try {
      return estimateCost(parsed.rows, lines, fixtureAmountLines)
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) } as const
    }
  }, [parsed, quantities, autoList, fixtureAmountLines])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `${OBJECT_MENU_WIDTH}px 1fr 360px`, height: '100%' }}>
      <ObjectMenu
        sources={objectSources}
        selectedKind={selectedKind}
        onSelect={setSelectedKind}
        caption="種類ごとの件数（P3 の自動作成の結果）"
        notice={noticeOfPlan(plan)}
        objectRows={objectRows}
      />
      <div style={{ padding: 16, overflow: 'auto' }}>
        <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>P4 積算 — 単価と数量</h2>
        {plan ? (
          <section style={{ marginBottom: 12, fontSize: 12 }}>
            <strong>住戸タイプ別の内装（1 戸あたり × 戸数。G61）</strong>
            {(() => {
              const cells = plan.cells.map((c) => ({ id: c.id, x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1 }))
              const rows = breakdownByUnitType(
                cells.map((c) => ({ id: c.id, type: plan.unitType })),
                roomsByUnit(plan.rooms, cells),
                { storeyCount: plan.ev.storey_count, ceilingHeightMm: CEILING_MM },
              )
              return rows.length === 0 ? (
                <p>住戸がまだありません</p>
              ) : (
                <table style={{ borderCollapse: 'collapse', marginTop: 4 }}>
                  <thead>
                    <tr>
                      <th align="left">住戸タイプ</th>
                      <th align="right">戸数</th>
                      <th align="right">1 戸あたり 床 ㎡</th>
                      <th align="right">合計 床 ㎡</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.type}>
                        <td>{r.type}</td>
                        <td align="right">{r.count}</td>
                        <td align="right">{r.perUnit.floorM2.toFixed(2)}</td>
                        <td align="right">{r.total.floorM2.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            })()}
          </section>
        ) : null}
        {plan ? (
          <figure style={{ margin: '0 0 12px' }}>
            <svg viewBox={`-500 -500 ${plan.widthMm + 1000} ${plan.depthMm + 1000}`} style={{ width: '100%', maxWidth: 480, background: '#fbfbf8', border: '1px solid #ddd8cc' }}>
              <rect x={plan.corridor.x0} y={plan.corridor.y0} width={plan.corridor.x1 - plan.corridor.x0} height={plan.corridor.y1 - plan.corridor.y0} fill="#eee" />
              {plan.rooms.map((r) => (
                <rect key={r.id} x={r.x0} y={r.y0} width={r.x1 - r.x0} height={r.y1 - r.y0} fill={ROOM_FILL[r.kind]} stroke="#8a8478" strokeWidth={20} />
              ))}
              <FixtureLayer cells={plan.cells} fixtures={fixtures} active={false} onTap={NO_OP} onRemove={NO_OP} readOnly />
            </svg>
            <figcaption style={{ fontSize: 12, color: '#666' }}>
              P3 の自動作成の部屋割り（仮置き）。LDK（青）・洋室（緑）・水回り（灰）。3LDK の洋室 3 室は未決のため、ここは 2 室。
            </figcaption>
          </figure>
        ) : null}
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
        <section style={{ margin: '0 0 12px' }}>
          <h3 style={{ fontSize: 14, margin: '0 0 4px' }}>数量の内訳（区分別・自動で拾えたもの）</h3>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th align="left">区分</th>
                <th align="left">品目</th>
                <th align="right">数量</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORY_ORDER.map((cat) => {
                const rows = autoQuantities.filter((q) => q.category === cat)
                return rows.length === 0 ? (
                  <tr key={cat}>
                    <td>{cat}</td>
                    <td colSpan={2} style={{ color: '#666' }}>
                      未拾い（この区分の数量は、対応するオブジェクトを作ってから）
                    </td>
                  </tr>
                ) : (
                  rows.map((q) => (
                    <tr key={q.item}>
                      <td>{cat}</td>
                      <td>
                        {q.item}
                        {' '}
                        <span style={{ fontSize: 11, color: '#a86b00' }}>未確定</span>
                      </td>
                      <td align="right">{q.quantity.toLocaleString('ja-JP', { maximumFractionDigits: 1 })} {q.unit === 'm3' ? 'm³' : q.unit === 't' ? 't' : 'm²'}</td>
                    </tr>
                  ))
                )
              })}
            </tbody>
          </table>
        </section>
        <FixtureSummary
          fixtures={fixtures}
          unitIds={fixtureUnitIds ?? undefined}
          unitPriceTexts={fixtureUnitPriceTexts}
          onUnitPriceChange={setFixtureUnitPriceText}
        />
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
