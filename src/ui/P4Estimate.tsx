// P4 積算（D-04 P4、D-02 C8、A-03 G19・G21・G22・G63）。単価は利用者が出典つきの CSV で置く（G20）。
// 置き場は G72 で未決のため、ここは貼り付けの CSV を読む形にしている。数量は利用者が入れる（数量の拾い方は仮置き）。
import { useEffect, useMemo, useState } from 'react'
import { useObjectTable } from '../store/objectTable'
import { useEstimateLines } from '../store/estimateLines'
import { usePriceTable } from '../store/priceTable'
import { useComponentFire } from '../store/componentFire'
import {
  detailLinesOfObjects,
  exteriorRow,
  interiorRow,
  planExteriorRow,
  sashRow,
  siteRow,
  slabObjectRow,
} from '../estimate/estimateObjects'
import type { RebarCondition } from '../estimate/rebarCondition'
import { estimateDetailsOf } from '../estimate/estimateDetails'
import { isLaborItem } from '../estimate/laborConversion'
import {
  autoQuantityOfPrice,
  manualQuantityOfPrice,
  quantityLinesOfTable,
  refreshManualLines,
  withManualQuantity,
  withOriginLines,
} from '../estimate/estimateTable'
import { estimateCost, CATEGORIES, type PriceRow } from '../estimate/estimate'
import { parsePriceCsv } from '../estimate/priceCsv'
import { estimateFixtureCost, fixtureCostLines, parseUnitPrices } from '../estimate/fixtureCost'
import { lotAreaMm2, lotOf } from '../plan/lot'
import { lotOfConfirmed, useConfirmedSite } from '../store/confirmedSite'
import { objectTableOf, type ObjectRow } from '../plan/objectTable'
import { p2Entries, useDrawing } from '../store/drawing'
import { p4CanGoNext } from './p4NextGate'
import { nextGateOf, p4NextIssuesOf, type CheckIssue } from '../plan/nextCheck'
import { NextCheckPanel } from './NextCheckPanel'
import { recordWorkLog } from '../app/workLogStore'
import { useSemantic } from '../store/semantic'
import { breakdownByUnitType, roomsByUnit } from '../estimate/unitTypeBreakdown'
import type { ObjectKind } from '../plan/objectMenu'
import { noticeOfPlan, objectSourcesOfPlan, tableInputOfPlan } from '../plan/objectSourcesOfPlan'
import { sourcesOfTable } from '../plan/objectCountsOfTable'
import type { RoomKind } from '../plan/rooms'
import { useFixtures } from '../store/fixtures'
import { useSite } from '../store/site'
import { cutFloorAreasOf } from '../volume/cutVolume'
import { FixtureLayer } from './FixtureLayer'
import { FixtureSummary } from './FixtureSummary'
import { objectMenuWidthOf, ObjectMenu } from './ObjectMenu'
import { objectMenuFoldedByDefault, useObjectMenuFold } from './objectMenuFold'
import { isRightItemShown, useActiveMode } from '../store/mode'
import { SCREEN_MODES } from '../app/screenModes'
import { usePanelTiles } from '../store/panelTiles'
import { PanelTile } from './PanelTile'
import { ChatTile } from './ChatTile'

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

export function P4Estimate({ onNext }: { onNext?: () => void } = {}) {
  // 単価表は店舗が持つ（チャットの積算の操作と同じ表。t55）
  const csv = usePriceTable((s) => s.csv)
  const setCsv = usePriceTable((s) => s.setCsv)
  const [quantities, setQuantities] = useState<Record<string, string>>({})

  const parsed = useMemo<{ rows: PriceRow[] } | { error: string }>(() => {
    try {
      return { rows: parsePriceCsv(csv) }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }, [csv])
  // 単価（参照）の欄は、参照の ID ではなく単価表の品目の名前を出す（統括の依頼 2026-11-06。ID を画面に出さない）。表に無い ID はそのまま出す
  const itemNameOfRef = (ref: string): string => ('rows' in parsed ? parsed.rows.find((r) => r.id === ref)?.item : undefined) ?? ref

  // P2 の外形から拾った数量（外壁・屋根）。P2 で外形が閉じていれば入る
  // 外形は P2 が渡したもの。階数・階高は今の店舗の値、切り取った階の面積はそこから計算する（統括の依頼 2026-11-06。依頼 B。チャットで階数が変わっても古い値を使わない）
  const publishedVolume = useSite((s) => s.volume)
  const slopeBoundaries = useSite((s) => s.slopeBoundaries)
  const storeysNow = useDrawing((s) => s.storeyCount)
  const heightNow = useDrawing((s) => s.storeyHeightMm)
  const volume = useMemo(
    () =>
      publishedVolume
        ? {
            footprint: publishedVolume.footprint,
            storey_count: storeysNow,
            storey_height: heightNow,
            floor_areas_mm2: cutFloorAreasOf(publishedVolume.footprint, slopeBoundaries, { storey_count: storeysNow, storey_height: heightNow }),
          }
        : null,
    [publishedVolume, slopeBoundaries, storeysNow, heightNow],
  )
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
  // 描いた線は P2 の線だけ（P3 の線は P3 の欄で見る）
  const drawnAll = useDrawing((s) => s.entries)
  const drawnEntries = useMemo(() => p2Entries(drawnAll), [drawnAll])
  const assignments = useSemantic((s) => s.assignments)
  // 敷地の面積: 確定した敷地の筆（無ければダミー）。P2 の敷地と同じ値（統括の依頼 2026-11-06。1）
  const confirmedSite = useConfirmedSite((s) => s.confirmed)
  const siteAreaMm2 = useMemo(() => lotAreaMm2(lotOf(lotOfConfirmed(confirmedSite))), [confirmedSite])
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
  // 鉄筋の被り厚と継手（G86。仮の条件。係数は仮置き）
  const rebar = useComponentFire((s) => s.rebar)
  const setRebar = useComponentFire((s) => s.setRebar)
  // 左メニュー（G55）: P3 の自動作成の結果（plan）から、種類ごとの件数と、選んだ種類の中身を出す。自動作成の前は全部 0 で、注記を付ける
  // 什器（G69）は自動作成の結果ではなく店舗のもの（P3 で置いた什器。下の什器の欄と同じ値）なので、自動作成の前でも件数を出す
  const [selectedKind, setSelectedKind] = useState<ObjectKind | null>(null)
  const objectSources = useMemo(() => objectSourcesOfPlan(plan, fixtures), [plan, fixtures])
  // 住戸をグループとして数える（G58）。自動作成の結果からオブジェクト表の行を作り、表（SQLite）に書いて、表から読む
  const derivedObjectRows = useMemo(() => {
    const rows: ObjectRow[] = objectTableOf(tableInputOfPlan(plan, fixtures))
    // 積算の数量も表の行にする（G86）。躯体・外装・外構は外形から、内装と基準階の外装は P3 の結果から、サッシは描いた開口から
    if (volume) {
      rows.push(
        slabObjectRow(volume.footprint, volume.storey_count, volume.storey_height, volume.floor_areas_mm2),
        exteriorRow(volume.footprint, volume.storey_count, volume.storey_height, volume.floor_areas_mm2?.[0]),
        siteRow(volume.footprint, siteAreaMm2),
      )
    }
    if (plan) {
      rows.push(
        interiorRow(plan.rooms, { storeyCount: plan.ev.storey_count, ceilingHeightMm: CEILING_MM }),
        planExteriorRow({
          corridor: plan.corridor,
          cores: plan.cores,
          cells: plan.cells,
          outline: { W: plan.widthMm, D: plan.depthMm },
          storeyCount: plan.ev.storey_count,
        }),
      )
    }
    const segments = drawnEntries.flatMap((e) => e.segments)
    const kinds = Object.fromEntries(segments.map((s) => [s.id, assignments[s.id]?.kind ?? null]))
    rows.push(sashRow(segments, kinds))
    return rows
  }, [plan, fixtures, volume, drawnEntries, assignments, siteAreaMm2])
  // 左の一覧の件数（G78）は、この表の行から数える（別の集計表は作らない）
  const countSources = useMemo(() => sourcesOfTable(derivedObjectRows), [derivedObjectRows])
  const objectRows = useObjectTable((s) => s.rows)
  // 数量の明細（G86）: 上で作った表の行から出す。躯体・外装・外構・内装・サッシのすべてが、この明細を正本にする。ストアへの書き込みは待たない
  const detailLines = useMemo(() => detailLinesOfObjects(derivedObjectRows, rebar), [derivedObjectRows, rebar])
  const objectPersisted = useObjectTable((s) => s.persisted)
  useEffect(() => {
    void useObjectTable.getState().init()
  }, [])
  useEffect(() => {
    useObjectTable.getState().setRows(derivedObjectRows)
  }, [derivedObjectRows, objectPersisted])
  // 見積の明細（G86）: 数量の明細に単価の参照と金額を付けて、表（SQLite の estimate_line）に書く。単価の表が読めないときは参照を付けない（未参照）
  const estimateLinesPersisted = useEstimateLines((s) => s.persisted)
  // 数量の内訳（G86）: 見積の明細の表から読む（表が正本。自動で拾った値は、表に書いてから出る）
  const estimateLines = useEstimateLines((s) => s.lines)
  useEffect(() => {
    void useEstimateLines.getState().init()
  }, [])
  useEffect(() => {
    const store = useEstimateLines.getState()
    const prices = 'rows' in parsed ? parsed.rows : []
    // 自動の行は入れ替える。手入力の行は、単価の表に合わせて金額を取り直して残す（G86）
    store.setLines(withOriginLines(refreshManualLines(store.lines, prices), '自動', estimateDetailsOf(detailLines, prices)))
  }, [detailLines, parsed, estimateLinesPersisted])

  // 工事原価（G86）: 見積の明細の表の行から数量を出し、単価を当てて合計する。手入力は自動より優先し、歩掛の労務も表の行に入っている
  const estimate = useMemo(() => {
    if (!('rows' in parsed)) return null
    try {
      return estimateCost(parsed.rows, quantityLinesOfTable(estimateLines, parsed.rows), fixtureAmountLines)
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) } as const
    }
  }, [parsed, estimateLines, fixtureAmountLines])

  // 左のオブジェクト一覧の開閉（G55）。描画（システム）のモードは折りたたんで始める。モードが変わると既定に戻る
  const activeMode = useActiveMode('P4')
  const menuFold = useObjectMenuFold(`P4-${activeMode}`, objectMenuFoldedByDefault(activeMode, 'plan'))
  // 右パネルの項目は、今のモードと画面の組で決まる（G100・G95）。P4 はチャットだけ
  const hiddenTiles = usePanelTiles((s) => s.hidden)
  const rightShown = (id: string) => isRightItemShown(SCREEN_MODES, activeMode, 'P4', hiddenTiles, id)

  // 次へ（D-04 P4。G158）: 押したとき、工事原価・単価未設定・未確定の品目を確かめる。問題が無ければ進む。あれば一覧を出し、直すか、このまま進むかを選ぶ（止めない）
  const [nextIssues, setNextIssues] = useState<CheckIssue[] | null>(null)
  const p4Issues = (): CheckIssue[] => [
    ...(p4CanGoNext(estimate) ? [] : [{ area: '工事原価', text: '工事原価が出ていない' }]),
    ...p4NextIssuesOf({
      laborUnset: estimateLines.filter((q) => q.unitPriceRef === null && isLaborItem(q.item)).map((q) => q.item),
      provisional: estimateLines.map((q) => q.item),
    }),
  ]
  const clickNextP4 = () => {
    const issues = p4Issues()
    if (nextGateOf(issues) === 'go') onNext?.()
    else setNextIssues(issues)
  }
  const goNextP4Anyway = (issues: readonly CheckIssue[]) => {
    recordWorkLog({
      at: new Date().toISOString(),
      screen: 'P4',
      action: '次へ（要確認として残した）',
      target: issues.map((i) => `${i.area}: ${i.text}`).join(' / '),
      who: 'human',
    })
    setNextIssues(null)
    onNext?.()
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `${objectMenuWidthOf(menuFold.folded)}px 1fr 360px`, height: '100%' }}>
      <ObjectMenu
        sources={objectSources}
        countSources={countSources}
        selectedKind={selectedKind}
        onSelect={setSelectedKind}
        caption="種類ごとの件数（平面の自動作成の結果）"
        notice={noticeOfPlan(plan)}
        objectRows={objectRows}
        folded={menuFold.folded}
        onToggleFold={menuFold.toggle}
      />
      <div style={{ padding: 16, overflow: 'auto' }}>
        <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>積算 — 単価と数量</h2>
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
              平面の自動作成の部屋割り（仮置き）。LDK（青）・洋室（緑）・水回り（灰）。3LDK の洋室 3 室は未決のため、ここは 2 室。
            </figcaption>
          </figure>
        ) : null}
        {volume ? (
          <figure style={{ margin: '0 0 12px' }}>
            <svg viewBox={`${planBox.x0} ${planBox.y0} ${planBox.w} ${planBox.h}`} style={{ width: '100%', maxWidth: 420, background: '#fbfbf8', border: '1px solid #ddd8cc' }}>
              <polygon points={volume.footprint.map((p) => `${p.x},${-p.y}`).join(' ')} fill="rgba(47,122,79,0.12)" stroke="#2f7a4f" strokeWidth={planBox.w / 160} />
            </svg>
            <figcaption style={{ fontSize: 12, color: '#666' }}>
              外形（ボリューム）。外壁と屋根は外装として拾う。室の内装の塗り分けは、平面で部屋を作ってから出す（未実装）。
            </figcaption>
          </figure>
        ) : (
          <p style={{ fontSize: 12, color: '#666' }}>ボリュームで外形を閉じると、外壁と屋根の数量を自動で拾います。</p>
        )}
        <section style={{ margin: '0 0 12px' }}>
          <h3 style={{ fontSize: 14, margin: '0 0 4px' }}>数量の内訳（区分別・自動で拾えたもの）</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '0 0 6px', fontSize: 12 }}>
            <label>
              鉄筋の被り厚（mm。仮の条件）{' '}
              <select value={rebar.coverMm} onChange={(e) => setRebar({ coverMm: Number(e.target.value) })}>
                {[30, 40, 50].map((mm) => (
                  <option key={mm} value={mm}>
                    {mm}
                  </option>
                ))}
              </select>
            </label>
            <label>
              継手（仮の条件）{' '}
              <select value={rebar.joint} onChange={(e) => setRebar({ joint: e.target.value as RebarCondition['joint'] })}>
                <option value="重ね継手">重ね継手</option>
                <option value="カプラー">カプラー</option>
              </select>
            </label>
          </div>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, background: '#fff', color: '#1f2a44' }}>
            <thead>
              <tr>
                <th align="left">区分</th>
                <th align="left">品目</th>
                <th align="right">数量</th>
                <th align="left">単価（参照）</th>
                <th align="right">金額（円）</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORY_ORDER.map((cat) => {
                const rows = estimateLines.filter((q) => q.category === cat)
                return rows.length === 0 ? (
                  <tr key={cat}>
                    <td>{cat}</td>
                    <td colSpan={4} style={{ color: '#666' }}>
                      未拾い（この区分の数量は、対応するオブジェクトを作ってから）
                    </td>
                  </tr>
                ) : (
                  rows.map((q) => (
                    <tr key={q.lineId}>
                      <td>{cat}</td>
                      <td>
                        {q.item}
                        {' '}
                        <span style={{ fontSize: 11, color: '#a86b00' }}>未確定</span>
                        {q.origin === '手入力' ? <span style={{ marginLeft: 6, fontSize: 11, color: '#2f7a4f' }}>手入力</span> : null}
                        <div style={{ fontSize: 11, color: '#666' }}>出典: {q.source}</div>
                      </td>
                      <td align="right">{q.quantity.toLocaleString('ja-JP', { maximumFractionDigits: 1 })} {q.unit === 'm3' ? 'm³' : q.unit === 't' ? 't' : 'm²'}</td>
                      {/* 対応のある労務で単価の参照が無い行は「単価未設定」（単価は利用者が置く。G20・G136）。isLaborUnset と同じ判定 */}
                      <td>{q.unitPriceRef ? itemNameOfRef(q.unitPriceRef) : isLaborItem(q.item) ? '単価未設定' : '未参照'}</td>
                      <td align="right">{q.amountYen === null ? '—' : q.amountYen.toLocaleString('ja-JP')}</td>
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
                      value={quantities[r.id] ?? String(manualQuantityOfPrice(estimateLines, r.id) ?? '')}
                      onChange={(e) => {
                        const text = e.target.value
                        setQuantities({ ...quantities, [r.id]: text })
                        // 手入力の数量は表に書く（工事原価と数量の内訳は表から読む）。空・数でない文字は、その単価の手入力を外す
                        const store = useEstimateLines.getState()
                        store.setLines(withManualQuantity(store.lines, r, text))
                      }}
                      style={{ width: 90, textAlign: 'right' }}
                    />
                    {(() => {
                      const auto = autoQuantityOfPrice(estimateLines, r.id)
                      return manualQuantityOfPrice(estimateLines, r.id) === null && auto !== null ? (
                        <span style={{ marginLeft: 6, fontSize: 11, color: '#2f7a4f' }}>自動 {Math.round(auto).toLocaleString('ja-JP')} m²</span>
                      ) : null
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
        {/* 次へ（D-04 P4）: 工事原価が出ているかを含めて確かめる。止めない（問題は一覧で出し、選ぶのは利用者） */}
        <div style={{ marginTop: 12 }}>
          <button type="button" onClick={clickNextP4}>
            次へ（出力）
          </button>
          {nextIssues !== null ? (
            <NextCheckPanel
              issues={nextIssues}
              goLabel="このまま進む（要確認として残す）"
              onStay={() => setNextIssues(null)}
              onGoAnyway={() => goNextP4Anyway(nextIssues)}
            />
          ) : null}
        </div>
        <h3 style={{ fontSize: 14, margin: '12px 0 4px' }}>未決</h3>
        <ul style={{ margin: 0, paddingLeft: 18, color: '#666', fontSize: 12 }}>
          <li>単価の置き場（G72、代表の答え待ち）</li>
          <li>ユニットバス・什器の歩掛（出典なし。G22）</li>
          <li>数量の拾い方は仮置き（D-02 C8）</li>
        </ul>
        {!rightShown('claude-chat') ? null : (
          <PanelTile title="Claude（チャット）" onHide={() => usePanelTiles.getState().hideTile('claude-chat')}>
            <h2>Claude（チャット）</h2>
            <ChatTile screen="P4" />
          </PanelTile>
        )}
      </aside>
    </div>
  )
}
