import { savedPlanStructureRows } from '../estimate/savedPlanStructure'
import { SLAB_THICKNESS_MM } from '../plan/buildingDimensions'
import {standardSelections} from '../estimate/standardSelections'
import {PlanFrameLayer} from './PlanFrameLayer'
import {useBimSettings,drawingDimensions as dimensionsOfPlan} from '../store/bimSettings'
import {ResizableSidebar,useRightPanelWidth} from './ResizableSidebar'
import {FixtureSummary} from './FixtureSummary'
import {estimateFixtureCost,fixtureCostLines,parseUnitPrices} from '../estimate/fixtureCost'
import {priceOfLine} from '../estimate/laborConversion'
import {fixtureLabel} from '../plan/fixtures'
import {SpecPackagePanel} from './SpecPackagePanel'
import {useSpecSelections} from '../store/specSelections'
import {planSpecObjects} from '../estimate/planSpecObjects'
import {selectedPackageLines,changePackage} from '../estimate/specPackages'
import {packageDetails,remainingLegacyDetails} from '../estimate/specIntegration'
import {slabAreaMm2} from '../estimate/slabArea'
import {BalconyLayer} from './BalconyLayer'
import {preliminarySections} from '../plan/preliminarySections'
import {EntryCheckPanel} from './EntryCheckPanel'
import {fixtureDetails} from '../estimate/fixtureDetails'
import {UnitPlanDrawing} from './UnitPlanDrawing'
import {CirculationLayer} from './CirculationLayer'
import {corridorForCell} from '../plan/planCorridors'
import {fixturesFromPlans} from '../estimate/planFixtures'
import {useFloorPlans} from '../store/floorPlans'
// P4 積算（D-04 P4、D-02 C8、A-03 G19・G21・G22・G63）。単価は利用者が出典つきの CSV で置く（G20）。
// 置き場は G72 で未決のため、ここは貼り付けの CSV を読む形にしている。数量は利用者が入れる（数量の拾い方は仮置き）。
import { useEffect, useMemo, useState } from 'react'
import { useObjectTable } from '../store/objectTable'
import { useEstimateLines } from '../store/estimateLines'
import { usePriceTable } from '../store/priceTable'
import { useComponentFire } from '../store/componentFire'
import {
  detailLinesOfObjects,
  stairRows,
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
import { lotAreaMm2, lotOf } from '../plan/lot'
import { lotOfConfirmed, useConfirmedSite } from '../store/confirmedSite'
import { objectTableOf, type ObjectRow } from '../plan/objectTable'
import { p2Entries, useDrawing } from '../store/drawing'
import { p4CanGoNext } from './p4NextGate'
import { nextGateOf, p4NextIssuesOf, type CheckIssue } from '../plan/nextCheck'
import { NextCheckPanel } from './NextCheckPanel'
import { recordWorkLog } from '../app/workLogStore'
import { useSemantic } from '../store/semantic'
import {savedUnitSummary} from '../estimate/savedUnitSummary'
import type { ObjectKind } from '../plan/objectMenu'
import { noticeOfPlan, objectSourcesOfPlan, tableInputOfPlan } from '../plan/objectSourcesOfPlan'
import { sourcesOfTable } from '../plan/objectCountsOfTable'
import { useFixtures } from '../store/fixtures'
import { useSite } from '../store/site'
import { cutFloorAreasOf } from '../volume/cutVolume'
import { FixtureLayer } from './FixtureLayer'
import { ResizableObjectMenu as ObjectMenu } from './ObjectMenu'
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
export function P4Estimate({ onNext }: { onNext?: () => void } = {}) {
  const rightPanelWidth=useRightPanelWidth(s=>s.width)
  const [drawingZoom,setDrawingZoom]=useState(1)
  const sectionInputs={fc:'24',ratio:'0.2',extraDead:'2',live:'1.8'}
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
  const legacyPlan = useSite((s) => s.plan)
  const floorPlans = useFloorPlans(s=>s.plans)
  const selectedFloor=useFloorPlans(s=>s.selected)
  const plan = Object.keys(floorPlans).length ? floorPlans[selectedFloor] ?? null : legacyPlan
  const bimSettings=useBimSettings(s=>s.settings)
  const sectionResult=useMemo(()=>plan?preliminarySections(plan,{floors:storeysNow,fc:Number(sectionInputs.fc),ratio:Number(sectionInputs.ratio),extraDead:Number(sectionInputs.extraDead),live:Number(sectionInputs.live),slabMm:SLAB_THICKNESS_MM}):null,[plan,storeysNow,sectionInputs])


  // サッシ（G62）: 描いた線のうち、種類が開口の線の長さから拾う（高さは仮置き）
  // 描いた線は P2 の線だけ（P3 の線は P3 の欄で見る）
  const drawnAll = useDrawing((s) => s.entries)
  const drawnEntries = useMemo(() => p2Entries(drawnAll), [drawnAll])
  const assignments = useSemantic((s) => s.assignments)
  // 敷地の面積: 確定した敷地の筆（無ければダミー）。P2 の敷地と同じ値（統括の依頼 2026-11-06。1）
  const confirmedSite = useConfirmedSite((s) => s.confirmed)
  const siteAreaMm2 = useMemo(() => lotAreaMm2(lotOf(lotOfConfirmed(confirmedSite))), [confirmedSite])
  // 什器（G69）: P3 で置いたもの。品目ごとに単価（円/台）を入れると、台数 × 単価を工事原価の合計に入れる（出典なしの仮置き。空欄の品目は入れない）
  const manualFixtures = useFixtures((s) => s.fixtures)
  const manualUnitIds = useFixtures(s=>s.unitIds)
  const fixtures=useMemo(()=>[...fixturesFromPlans(floorPlans),...manualFixtures],[floorPlans,manualFixtures])
  // 工事原価（概算）に渡す什器の行（単価を入れて、1 台以上置いた品目。区分は内装）
  // 鉄筋の被り厚と継手（G86。仮の条件。係数は仮置き）
  const rebar = useComponentFire((s) => s.rebar)
  const setRebar = useComponentFire((s) => s.setRebar)
  // 左メニュー（G55）: P3 の自動作成の結果（plan）から、種類ごとの件数と、選んだ種類の中身を出す。自動作成の前は全部 0 で、注記を付ける
  // 什器（G69）は自動作成の結果ではなく店舗のもの（P3 で置いた什器。下の什器の欄と同じ値）なので、自動作成の前でも件数を出す
  const [selectedKind, setSelectedKind] = useState<ObjectKind | null>(null)
  const objectSources = useMemo(() => objectSourcesOfPlan(plan, fixtures), [plan, fixtures])
  // 住戸をグループとして数える（G58）。自動作成の結果からオブジェクト表の行を作り、表（SQLite）に書いて、表から読む
  const derivedObjectRows = useMemo(() => {
    const rows: ObjectRow[] = [...objectTableOf(tableInputOfPlan(plan, fixtures)), ...savedPlanStructureRows(floorPlans)]
    // 積算の数量も表の行にする（G86）。躯体・外装・外構は外形から、内装と基準階の外装は P3 の結果から、サッシは描いた開口から
    if (volume) {
      const planned=plan&&Object.values(floorPlans).includes(plan)?floorPlans:{}
      const rectArea=(r:{x0:number;x1:number;y0:number;y1:number})=>(r.x1-r.x0)*(r.y1-r.y0)
      const areas=volume.floor_areas_mm2.map((area,i)=>{const p=planned[i+1];return Math.max(0,(p?.balconies&&p.buildingOutline?slabAreaMm2(p.buildingOutline,p.balconies,p.voids??[]):area)-(p?.balconies&&p.buildingOutline?0:(p?.voids??[]).reduce((sum,v)=>sum+rectArea(v),0)))})
      rows.push(
        ...(Object.keys(floorPlans).length ? [] : [slabObjectRow(volume.footprint, volume.storey_count, volume.storey_height, areas)]),
        ...(Object.keys(planned).length&&Object.values(planned).every(p=>p.balconies&&p.buildingOutline)?Object.entries(planned).map(([floor,p])=>{
          const row=exteriorRow(p.buildingOutline!,1,volume.storey_height,Number(floor)===volume.storey_count?slabAreaMm2(p.buildingOutline!,[],p.voids??[]):0)
          return {...row,id:`exterior-floor-${floor}`}
        }):[exteriorRow(volume.footprint, volume.storey_count, volume.storey_height, areas.at(-1))]),
        siteRow(volume.footprint, siteAreaMm2),
      )
    }
    if (plan) {
      rows.push(
        interiorRow(Object.values(floorPlans).includes(plan) ? Object.values(floorPlans).flatMap(p=>p.rooms) : plan.rooms, { storeyCount: Object.values(floorPlans).includes(plan) ? 1 : plan.ev.storey_count, ceilingHeightMm: CEILING_MM }),

      )
    }
    if(plan){
      const entries=Object.values(floorPlans).includes(plan)?Object.entries(floorPlans):[['表示階',plan] as const]
      for(const [floor,p] of entries){
        const row=planExteriorRow({corridor:p.corridor,corridors:[...(p.corridors??[p.corridor]),...(p.bridges??[])],cores:p.cores,cells:p.cells,outline:{W:p.widthMm,D:p.depthMm},storeyCount:Object.values(floorPlans).includes(plan)?1:p.ev.storey_count,balconies:p.balconies??[]})
        rows.push({...row,id:`plan-exterior-${floor}`,name:`${floor}階のバルコニー・共用廊下`})
      }
    }
    if(plan && Object.values(floorPlans).includes(plan)) rows.push(...stairRows(floorPlans))
    const segments = drawnEntries.flatMap((e) => e.segments)
    const kinds = Object.fromEntries(segments.map((s) => [s.id, assignments[s.id]?.kind ?? null]))
    rows.push(sashRow(segments, kinds))
    return rows
  }, [plan, floorPlans, fixtures, volume, drawnEntries, assignments, siteAreaMm2])
  // 左の一覧の件数（G78）は、この表の行から数える（別の集計表は作らない）
  const countSources = useMemo(() => sourcesOfTable(derivedObjectRows), [derivedObjectRows])
  const objectRows = useObjectTable((s) => s.rows)
  // 数量の明細（G86）: 上で作った表の行から出す。躯体・外装・外構・内装・サッシのすべてが、この明細を正本にする。ストアへの書き込みは待たない
  const detailLines = useMemo(() => [...detailLinesOfObjects(derivedObjectRows, rebar),...fixtureDetails(fixtures)], [derivedObjectRows, rebar, fixtures])
  const savedSpecSelections=useSpecSelections(s=>s.selections)
  const specObjects=useMemo(()=>planSpecObjects(floorPlans,manualFixtures,detailLines),[floorPlans,manualFixtures,detailLines])
  const specSelections=useMemo(()=>standardSelections(specObjects,savedSpecSelections,CEILING_MM,bimSettings.dimensions.doorHeightMm,true),[specObjects,savedSpecSelections,bimSettings.dimensions.doorHeightMm])
  useEffect(()=>{if(Object.keys(specSelections).length!==Object.keys(savedSpecSelections).length)useSpecSelections.setState({selections:specSelections})},[specSelections,savedSpecSelections])
  const packageLines=useMemo(()=>selectedPackageLines(specObjects,specSelections),[specObjects,specSelections])
  const floorWallObjects=specObjects.filter(o=>o.part==='壁'&&o.floor===selectedFloor)
  const partitionSpec=floorWallObjects.length&&floorWallObjects.every(o=>specSelections[o.id]?.packageId==='PKG-012')?'s12':''
  const setPartitionSpec=(value:string)=>{if(value==='s12')for(const o of floorWallObjects)useSpecSelections.getState().set(o.id,changePackage(specSelections[o.id],'PKG-012'))}
  const partitionStud=heightNow<=4000?65:heightNow<=4500?90:heightNow<=5000?100:0
  const drawingDimensions=dimensionsOfPlan(bimSettings)
  const unselectedFixtures=useMemo(()=>fixtures.filter(f=>!specObjects.some(o=>o.fixtureId===f.id&&packageLines.some(l=>l.objectId===o.id))),[fixtures,specObjects,packageLines])
  const fixtureUnitPriceTexts=useFixtures(s=>s.unitPriceTexts)
  const setFixtureUnitPriceText=useFixtures(s=>s.setUnitPriceText)
  const fixtureAmountLines=useMemo(()=>fixtureCostLines(estimateFixtureCost(unselectedFixtures.filter(f=>!('rows' in parsed&&priceOfLine({item:fixtureLabel(f.item),category:'内装',unit:'台',quantity:1},parsed.rows))),parseUnitPrices(fixtureUnitPriceTexts))),[unselectedFixtures,parsed,fixtureUnitPriceTexts])
  const objectPersisted = useObjectTable((s) => s.persisted)
  useEffect(() => {
    void useObjectTable.getState().init()
  }, [])
  useEffect(() => {
    useObjectTable.getState().setRows([...derivedObjectRows,...specObjects.map(o=>({id:o.id,kind:'other' as const,name:o.name??o.id,parent_id:null,quantity:o.quantity,attr:JSON.stringify({part:o.part,spec_bindings:specSelections[o.id]?[specSelections[o.id]]:[]})}))])
  }, [derivedObjectRows, objectPersisted,specObjects,specSelections])
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
    store.setLines(withOriginLines(refreshManualLines(store.lines, prices), '自動', [...estimateDetailsOf(remainingLegacyDetails([...detailLines.filter(l=>!l.lineId.startsWith('fixture-count/')),...fixtureDetails(unselectedFixtures)],specObjects,packageLines), prices),...packageDetails(packageLines)]))
  }, [detailLines, parsed, estimateLinesPersisted,specObjects,packageLines,unselectedFixtures])

  // 工事原価（G86）: 見積の明細の表の行から数量を出し、単価を当てて合計する。手入力は自動より優先し、歩掛の労務も表の行に入っている
  const estimate = useMemo(() => {
    if (!('rows' in parsed)) return null
    try {
      return estimateCost(parsed.rows, quantityLinesOfTable(estimateLines, parsed.rows), [...fixtureAmountLines,...estimateLines.filter(l=>l.specification&&l.amountYen!==null).map(l=>({id:l.lineId,category:l.category,yen:l.amountYen!,provisional:l.provisional}))])
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) } as const
    }
  }, [parsed, estimateLines,fixtureAmountLines])

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
    <div className="p4-estimate" style={{ display: 'grid', gridTemplateColumns: `max-content minmax(0, 1fr) ${rightPanelWidth}px`, height: '100%' }}>
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
      <div className="p4-main" style={{ padding: 16, overflow: 'auto' }}>
        <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>積算 — 単価と数量</h2>
        <SpecPackagePanel objects={specObjects}/>
        {plan ? (
          <section style={{ marginBottom: 12, fontSize: 12 }}>
            <strong>住戸タイプ別の実室面積（保存済み全階）</strong>
            {(() => {
              const rows = savedUnitSummary(Object.keys(floorPlans).length?floorPlans:{1:plan})
              return rows.length === 0 ? (
                <p>住戸がまだありません</p>
              ) : (
                <table style={{ borderCollapse: 'collapse', marginTop: 4 }}>
                  <thead>
                    <tr>
                      <th align="left">住戸タイプ</th>
                      <th align="right">戸数</th>
                      <th align="right">平均実室面積 ㎡</th>
                      <th align="right">合計実室面積 ㎡</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.type}>
                        <td>{r.type}</td>
                        <td align="right">{r.count}</td>
                        <td align="right">{r.averageM2.toFixed(2)}</td>
                        <td align="right">{r.totalM2.toFixed(2)}</td>
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
            <figcaption style={{fontSize:13,lineHeight:1.7,marginBottom:8}}>
              <strong>積算対象の詳細平面図{Object.entries(floorPlans).find(([,p])=>p===plan)?.[0] ? `（${Object.entries(floorPlans).find(([,p])=>p===plan)![0]}階）` : ''}</strong><br/>
              平面画面で選択していた階の部屋位置・形状を使っています。積算画面で別の間取りを生成したものではありません。<br/>
              平面と同じ住戸詳細を表示します。室境界・扉・窓・設備・柱位置・階段・EV・縦シャフトを確認できます。
            </figcaption>
            <details><summary>RC断面候補の自動算定・仮定（未確定）</summary>
              <p>床スラブ：200 mm（指定条件）。1階の柱を対象に、表示階の外形・柱配置が全階続く仮定で算定します。</p>
              <p>算定仮定：Fc 24 N/mm²、軸応力度/Fc 0.2、床以外の固定荷重2 kN/m²、積載荷重1.8 kN/m²。</p>
              {sectionResult&&('error' in sectionResult?<p role="alert">{sectionResult.error}</p>:<p>柱の共通断面候補：{sectionResult.side} × {sectionResult.side} mm。最大負担面積 {sectionResult.area.toFixed(2)} m² × 荷重 {sectionResult.q.toFixed(2)} kN/m² × {storeysNow}階 ＝ 軸力 {sectionResult.axialKN.toFixed(1)} kN。辺長＝√（軸力×1000÷Fc÷探索上限）、50 mm単位で切上げ。</p>)}
              <p>柱負担面積は最近接柱への面積分割、RC単位体積重量は24 kN/m³の仮定です。梁剛性・耐震・曲げ・せん断・配筋・基礎を未検証の断面候補で、構造設計の確定値ではありません。</p>
              <label>表示階の間仕切り一括仕様<select value={partitionSpec} onChange={e=>setPartitionSpec(e.target.value)}><option value="">個別選択・未選択（上の部材一覧）</option><option value="s12">S12を表示階の間仕切りへ適用</option></select></label>
              {partitionSpec==='s12'&&<p>{partitionStud?`階高 ${heightNow} mmを壁高さの上限として、下地${partitionStud}＋12.5×4＝壁厚${partitionStud+50} mm。`:'壁高さが選定表の範囲外です。'}<a href="https://www.yoshino-gypsum.com/system/S12" target="_blank" rel="noreferrer">メーカー選定例</a>。適用箇所・耐火遮音仕様は要確認。室内の間仕切りだけに表示します。</p>}
              <p>外壁仕上げ：タイル。RC外壁・戸境壁の厚さは、耐力壁の配置と構造解析が未設定のため算定保留です。</p>
            </details>
            {plan&&!plan.balconies&&<p role="alert">旧配置にはバルコニー形状がありません。ボリュームで再計算してください。バルコニー・手すりは未計上です。</p>}<EntryCheckPanel plan={plan}/>
            <div role="group" aria-label="積算図面の拡大縮小" style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
              <button onClick={()=>setDrawingZoom(z=>Math.max(1,z-0.5))} disabled={drawingZoom===1}>縮小</button>
              <output>{Math.round(drawingZoom*100)}%</output>
              <button onClick={()=>setDrawingZoom(z=>Math.min(4,z+0.5))} disabled={drawingZoom===4}>拡大</button>
              <button onClick={()=>setDrawingZoom(1)}>全体表示</button>
            </div>
            <div style={{overflow:'auto',maxHeight:'75vh',border:'1px solid #ddd8cc',background:'#fff'}}>
            <svg aria-label="積算対象の詳細平面図" viewBox={`-500 -500 ${plan.widthMm + 1000} ${plan.depthMm + 1000}`} style={{display:'block',width:`${drawingZoom*100}%`,maxWidth:'none'}}>
              {plan.buildingOutline?.length ? <polygon points={plan.buildingOutline.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#243953" strokeWidth={40}/> : <rect width={plan.widthMm} height={plan.depthMm} fill="none" stroke="#243953" strokeWidth={40}/>}
              {plan.circulation && <CirculationLayer plan={plan}/>}
              {plan.cells.map(cell=><UnitPlanDrawing dimensions={drawingDimensions} showColumns={!plan.buildingColumns} key={cell.id} cell={cell} corridor={corridorForCell(plan,cell)} typeId={plan.unitTypeIdsByCell?.[cell.id]??''} variant={plan.unitPlanVariants?.[cell.id]??'A'} override={plan.unitPlanOverrides?.[cell.id]}/>)}<BalconyLayer plan={plan}/><PlanFrameLayer plan={plan}/>
              {plan.shaftRects.map(s=><g key={s.id}><rect x={s.x0} y={s.y0} width={s.x1-s.x0} height={s.y1-s.y0} fill="#e1e8ed" stroke="#41576a" strokeWidth={25}/><text x={(s.x0+s.x1)/2} y={(s.y0+s.y1)/2} textAnchor="middle" fontSize={140}>{s.kind}</text></g>)}
              <FixtureLayer cells={plan.cells} fixtures={manualFixtures} active={false} onTap={NO_OP} onRemove={NO_OP} readOnly />
            </svg>
            </div>
            <figcaption style={{ fontSize: 12, color: '#666' }}>
              柱・壁・開口は平面画面と同じ保存済み形状と表示寸法です。RC断面候補は図面へ反映していません。柱・梁・基礎の部材数量は未接続です。図は選択した1階分、内装の数量は保存済み各階の部屋を集計します（各階データがない場合は表示階×階数）。
            </figcaption>
          </figure>
        ) : null}
        {volume ? (
          <details><summary>外壁・屋根の数量算定に使う建物外形を確認</summary><figure style={{ margin: '0 0 12px' }}>
            <svg viewBox={`${planBox.x0} ${planBox.y0} ${planBox.w} ${planBox.h}`} style={{ width: '100%', maxWidth: 200, background: '#fbfbf8', border: '1px solid #ddd8cc' }}>
              <polygon points={volume.footprint.map((p) => `${p.x},${-p.y}`).join(' ')} fill="rgba(47,122,79,0.12)" stroke="#2f7a4f" strokeWidth={planBox.w / 160} />
            </svg>
            <figcaption style={{ fontSize: 12, color: '#666' }}>
              外形（ボリューム）。外壁と屋根は外装として拾う。住戸の詳細は上の平面図で確認します。
            </figcaption>
          </figure></details>
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
                        {q.provisional&&<span style={{ fontSize: 11, color: '#a86b00' }}>{q.specification?'単価は仮値':'数量条件は仮定'}</span>}
                        {q.origin === '手入力' ? <span style={{ marginLeft: 6, fontSize: 11, color: '#2f7a4f' }}>手入力</span> : null}
                        <div style={{ fontSize: 11, color: '#666' }}>出典: {q.source}</div>
                      </td>
                      <td align="right">{q.quantity.toLocaleString('ja-JP', { maximumFractionDigits: 1 })} {q.unit === 'm3' ? 'm³' : q.unit === 't' ? 't' : q.unit==='m2'?'m²':q.unit}</td>
                      {/* 対応のある労務で単価の参照が無い行は「単価未設定」（単価は利用者が置く。G20・G136）。isLaborUnset と同じ判定 */}
                      <td>{q.specification?`${q.specification.priceStatus} ${q.specification.unitPrice?.toLocaleString()??'未設定'}円/${q.unit}`:q.unitPriceRef ? itemNameOfRef(q.unitPriceRef) : isLaborItem(q.item) ? '対応する労務単価が未登録' : '一致する品目・単位の単価が未登録'}</td>
                      <td align="right">{q.amountYen === null ? '—' : q.amountYen.toLocaleString('ja-JP')}</td>
                    </tr>
                  ))
                )
              })}
            </tbody>
          </table>
        </section>
        <details><summary>仕様未選択の什器の個別単価</summary><p>仕様を選択した部材はこの欄から除き、二重計上を防ぎます。</p><FixtureSummary fixtures={unselectedFixtures} unitIds={[...(manualUnitIds??[]),...Object.entries(floorPlans).flatMap(([floor,p])=>p.cells.map(c=>`${floor}F-${c.id}`))]} unitPriceTexts={fixtureUnitPriceTexts} onUnitPriceChange={setFixtureUnitPriceText}/></details>
        <details><summary>単価DBの管理・追加数量</summary><p>品目名・区分・単位を数量明細に合わせて登録すると、自動で参照して金額を集計します。什器は単位「台」、区分「内装」です。仕様・出典を確認した単価を登録してください。</p>
        <textarea aria-label="単価DBのCSV" value={csv} onChange={(e) => setCsv(e.target.value)} rows={8} style={{ width: '100%', fontFamily: 'monospace' }} />
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
        </details>
      </div>
      <ResizableSidebar style={{ padding: 12, borderLeft: '1px solid #ddd8cc', background: '#fff', overflowY: 'auto' }}>
        <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>計上済み金額（概算）</h3>
          <p style={{color:"#a33",fontSize:12}}>未参照・未拾い・単価未入力の項目は含みません。建物全体の見積額ではありません。</p>
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
            <h4 style={{margin:'16px 0 8px'}}>計上済み金額の内訳</h4>
            <p style={{fontSize:12}}>下表の金額を合計したものが上の計上済み金額です。{estimate.provisional ? "※は未確定の単価を含みます。" : ""}</p>
            {CATEGORIES.map(category=><section key={category} style={{marginBottom:14}}>
              <h5 style={{margin:'6px 0'}}>{category}：{yen(estimate.subtotals[category].yen)}</h5>
              <table aria-label={`${category}の計上内訳`} style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
                <thead><tr><th align="left">品目・算定根拠</th><th align="right">金額</th></tr></thead>
                <tbody>{estimate.lines.filter(l=>l.category===category).map((line,index)=>{
                  const packageDetail=estimateLines.find(l=>l.lineId===line.price_id)?.specification
                  const price='rows' in parsed?parsed.rows.find(p=>p.id===line.price_id):undefined
                  const quantity='rows' in parsed?quantityLinesOfTable(estimateLines,parsed.rows).filter(q=>q.price_id===line.price_id).reduce((n,q)=>n+q.quantity,0):0
                  return <tr key={`${line.price_id}-${index}`}><td style={{padding:'6px 0',borderBottom:'1px solid #eee'}}>{packageDetail?.name??price?.item??line.price_id.replace('fixture:','什器：')}<br/><small>{packageDetail?`${packageDetail.quantity} ${packageDetail.unit} × ${packageDetail.unitPrice}円／${packageDetail.priceStatus}／出典：${packageDetail.source}`:price?`${price.kind==='労務'?'対象数量 ':''}${quantity.toLocaleString('ja-JP',{maximumFractionDigits:3})}${price.kind==='労務'?'':` ${price.unit}`} × ${price.unit_price.toLocaleString()}円${price.kind==='労務'?`/${price.unit} × 歩掛${price.factor}`:''}`:'什器の台数×入力単価'}{price?.source_ref?`／出典：${price.source_ref}`:''}</small></td><td align="right" style={{whiteSpace:'nowrap',borderBottom:'1px solid #eee'}}>{yen(line.yen)}{line.provisional?' ※':''}</td></tr>
                })}{!estimate.lines.some(l=>l.category===category)&&<tr><td colSpan={2}>計上明細なし</td></tr>}</tbody>
              </table>
            </section>)}
            <p style={{ color: '#666', fontSize: 12 }}>直接仮設・共通仮設費・現場管理費・一般管理費は含めない。円単位の概算。</p>
          </>
        ) : (
          <p style={{ color: '#a33' }}>{estimate && 'error' in estimate ? estimate.error : '—'}</p>
        )}
        {/* 次へ（D-04 P4）: 工事原価が出ているかを含めて確かめる。止めない（問題は一覧で出し、選ぶのは利用者） */}
        <div style={{ marginTop: 12 }}>
          <button data-tutorial="tutorial-p4-next" type="button" onClick={clickNextP4} style={{ width: '100%', padding: 8, border: '1px solid #1f2a44', borderRadius: 6, background: '#1f2a44', color: '#fff', font: 'inherit', cursor: 'pointer' }}>
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
        {!rightShown('claude-chat') ? null : (
          <PanelTile title="Claude（チャット）" onHide={() => usePanelTiles.getState().hideTile('claude-chat')}>
            <h2>Claude（チャット）</h2>
            <ChatTile screen="P4" />
          </PanelTile>
        )}
      </ResizableSidebar>
    </div>
  )
}
