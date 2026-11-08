import {EstimateCsvPanel} from './EstimateCsvPanel'
import {applyMaterialPrices} from '../estimate/estimateCsv'
import {FloorPlanMenu} from './FloorPlanMenu'
import {useLeftPanelWidth} from './LeftPanelResize'
import {recordPage} from './recordPage'
import {RecordPagination} from './RecordPagination'
import { savedPlanStructureRows } from '../estimate/savedPlanStructure'
import { SLAB_THICKNESS_MM } from '../plan/buildingDimensions'
import {standardSelections} from '../estimate/standardSelections'
import {PlanFrameLayer} from './PlanFrameLayer'
import {useBimSettings,drawingDimensions as dimensionsOfPlan} from '../store/bimSettings'
import {ResizableSidebar,useRightPanelWidth} from './ResizableSidebar'
import {estimateFixtureCost,fixtureCostLines,parseUnitPrices} from '../estimate/fixtureCost'
import {priceOfLine} from '../estimate/laborConversion'
import {fixtureLabel} from '../plan/fixtures'
import {useSpecSelections} from '../store/specSelections'
import {planSpecObjects} from '../estimate/planSpecObjects'
import {selectedPackageLines} from '../estimate/specPackages'
import {packageDetails,remainingLegacyDetails} from '../estimate/specIntegration'
import {slabAreaMm2} from '../estimate/slabArea'
import {BalconyLayer} from './BalconyLayer'
import {preliminarySections} from '../plan/preliminarySections'
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
import { estimateDetailsOf } from '../estimate/estimateDetails'
import {
  quantityLinesOfTable,
  refreshManualLines,
  withOriginLines,
} from '../estimate/estimateTable'
import { estimateCost, CATEGORIES, type PriceRow } from '../estimate/estimate'
import { parsePriceCsv } from '../estimate/priceCsv'
import { lotAreaMm2, lotOf } from '../plan/lot'
import { lotOfConfirmed, useConfirmedSite } from '../store/confirmedSite'
import { objectTableOf, type ObjectRow } from '../plan/objectTable'
import { p2Entries, useDrawing } from '../store/drawing'
import { useSemantic } from '../store/semantic'
import { tableInputOfPlan } from '../plan/objectSourcesOfPlan'
import { useFixtures } from '../store/fixtures'
import { useSite } from '../store/site'
import { cutFloorAreasOf } from '../volume/cutVolume'
import { FixtureLayer } from './FixtureLayer'
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
export function P4Estimate({ onNext }: { onNext?: () => void } = {}) {
  const rightPanelWidth=useRightPanelWidth(s=>s.width)
  const [drawingZoom,setDrawingZoom]=useState(1)
  const sectionInputs={fc:'24',ratio:'0.2',extraDead:'2',live:'1.8'}
  // 単価表は店舗が持つ（チャットの積算の操作と同じ表。t55）
  const csv = usePriceTable((s) => s.csv)

  const parsed = useMemo<{ rows: PriceRow[] } | { error: string }>(() => {
    try {
      return { rows: parsePriceCsv(csv) }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }, [csv])
  // 単価（参照）の欄は、参照の ID ではなく単価表の品目の名前を出す（統括の依頼 2026-11-06。ID を画面に出さない）。表に無い ID はそのまま出す

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
  // 自動で拾う数量: 外装（P2 の外形）と内装（P3 の部屋。天井高は仮置き）。種類（区分）を付けて内訳に使う
  const floorPlans = useFloorPlans(s=>s.plans)
  const selectedFloor=useFloorPlans(s=>s.selected)
  const plan = floorPlans[selectedFloor] ?? null
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
  const fixtures=useMemo(()=>[...fixturesFromPlans(floorPlans),...manualFixtures],[floorPlans,manualFixtures])
  // 工事原価（概算）に渡す什器の行（単価を入れて、1 台以上置いた品目。区分は内装）
  // 鉄筋の被り厚と継手（G86。仮の条件。係数は仮置き）
  const rebar = useComponentFire((s) => s.rebar)
  // 左メニュー（G55）: P3 の自動作成の結果（plan）から、種類ごとの件数と、選んだ種類の中身を出す。自動作成の前は全部 0 で、注記を付ける
  // 什器（G69）は自動作成の結果ではなく店舗のもの（P3 で置いた什器。下の什器の欄と同じ値）なので、自動作成の前でも件数を出す
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
  // 数量の明細（G86）: 上で作った表の行から出す。躯体・外装・外構・内装・サッシのすべてが、この明細を正本にする。ストアへの書き込みは待たない
  const detailLines = useMemo(() => [...detailLinesOfObjects(derivedObjectRows, rebar),...fixtureDetails(fixtures)], [derivedObjectRows, rebar, fixtures])
  const savedSpecSelections=useSpecSelections(s=>s.selections)
  const specObjects=useMemo(()=>planSpecObjects(floorPlans,manualFixtures,detailLines),[floorPlans,manualFixtures,detailLines])
  const specSelections=useMemo(()=>standardSelections(specObjects,savedSpecSelections,CEILING_MM,bimSettings.dimensions.doorHeightMm,true),[specObjects,savedSpecSelections,bimSettings.dimensions.doorHeightMm])
  useEffect(()=>{if(Object.keys(specSelections).length!==Object.keys(savedSpecSelections).length)useSpecSelections.setState({selections:specSelections})},[specSelections,savedSpecSelections])
  const materialPrices=usePriceTable(s=>s.packagePrices)
  const effectiveSelections=useMemo(()=>applyMaterialPrices(specSelections,materialPrices??{}),[specSelections,materialPrices])
  const packageLines=useMemo(()=>selectedPackageLines(specObjects,effectiveSelections),[specObjects,effectiveSelections])
  const drawingDimensions=dimensionsOfPlan(bimSettings)
  const unselectedFixtures=useMemo(()=>fixtures.filter(f=>!specObjects.some(o=>o.fixtureId===f.id&&packageLines.some(l=>l.objectId===o.id))),[fixtures,specObjects,packageLines])
  const fixtureUnitPriceTexts=useFixtures(s=>s.unitPriceTexts)
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
  const [costPages,setCostPages]=useState<Record<string,number>>({})
  const [openCosts,setOpenCosts]=useState<Record<string,boolean>>({})
  const leftPanelWidth=useLeftPanelWidth(s=>s.width)
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
  const quantityByPrice=useMemo(()=>{const totals=new Map<string,number>();if('rows' in parsed)for(const q of quantityLinesOfTable(estimateLines,parsed.rows))totals.set(q.price_id,(totals.get(q.price_id)??0)+q.quantity);return totals},[estimateLines,parsed])


  const activeMode = useActiveMode('P4')
  // 右パネルの項目は、今のモードと画面の組で決まる（G100・G95）。P4 はチャットだけ
  const hiddenTiles = usePanelTiles((s) => s.hidden)
  const rightShown = (id: string) => isRightItemShown(SCREEN_MODES, activeMode, 'P4', hiddenTiles, id)

  return (
    <div className="p4-estimate" style={{ display: 'grid', gridTemplateColumns: `${leftPanelWidth}px minmax(0, 1fr) ${rightPanelWidth}px`, height: '100%' }}>
      <ResizableSidebar side="left" label="各階の平面" style={{borderRight:'1px solid #ddd8cc',background:'#fff'}}>
        <FloorPlanMenu readOnly floors={Array.from({length:storeysNow},(_,i)=>floorPlans[i+1]?.buildingOutline??(floorPlans[i+1]?[{x:0,y:0},{x:floorPlans[i+1]!.widthMm,y:0},{x:floorPlans[i+1]!.widthMm,y:floorPlans[i+1]!.depthMm},{x:0,y:floorPlans[i+1]!.depthMm}]:[]))} plans={floorPlans} widthMm={Math.max(1,...Object.values(floorPlans).map(p=>p.widthMm))} depthMm={Math.max(1,...Object.values(floorPlans).map(p=>p.depthMm))} selected={selectedFloor} onSelect={floor=>{useFloorPlans.getState().select(floor);setDrawingZoom(1)}}/>
      </ResizableSidebar>
      <div className="p4-main" style={{ padding: 16, overflow: 'auto' }}>
        <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>積算 — 単価と数量</h2>
        {plan ? (
          <figure style={{ margin: '0 0 12px' }}>
            <figcaption style={{fontSize:13,marginBottom:8}}><strong>{selectedFloor}階 平面図</strong></figcaption>
            <details><summary>RC断面候補の自動算定・仮定（未確定）</summary>
              <p>床スラブ：200 mm（指定条件）。1階の柱を対象に、表示階の外形・柱配置が全階続く仮定で算定します。</p>
              <p>算定仮定：Fc 24 N/mm²、軸応力度/Fc 0.2、床以外の固定荷重2 kN/m²、積載荷重1.8 kN/m²。</p>
              {sectionResult&&('error' in sectionResult?<p role="alert">{sectionResult.error}</p>:<p>柱の共通断面候補：{sectionResult.side} × {sectionResult.side} mm。最大負担面積 {sectionResult.area.toFixed(2)} m² × 荷重 {sectionResult.q.toFixed(2)} kN/m² × {storeysNow}階 ＝ 軸力 {sectionResult.axialKN.toFixed(1)} kN。辺長＝√（軸力×1000÷Fc÷探索上限）、50 mm単位で切上げ。</p>)}
              <p>柱負担面積は最近接柱への面積分割、RC単位体積重量は24 kN/m³の仮定です。梁剛性・耐震・曲げ・せん断・配筋・基礎を未検証の断面候補で、構造設計の確定値ではありません。</p>
              <p>外壁仕上げ：タイル。RC外壁・戸境壁の厚さは、耐力壁の配置と構造解析が未設定のため算定保留です。</p>
            </details>
            {plan&&!plan.balconies&&<p role="alert">旧配置にはバルコニー形状がありません。ボリュームで再計算してください。バルコニー・手すりは未計上です。</p>}
            <div role="group" aria-label="積算図面の拡大縮小" style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
              <button onClick={()=>setDrawingZoom(z=>Math.max(1,z-0.5))} disabled={drawingZoom===1}>縮小</button>
              <output>{Math.round(drawingZoom*100)}%</output>
              <button onClick={()=>setDrawingZoom(z=>Math.min(4,z+0.5))} disabled={drawingZoom===4}>拡大</button>
              <button onClick={()=>setDrawingZoom(1)}>全体表示</button>
            </div>
            <div style={{overflow:'auto',maxHeight:'75vh',border:'1px solid #ddd8cc',background:'#fff'}}>
            <svg aria-label="積算対象の詳細平面図" viewBox={`-500 -500 ${plan.widthMm + 1000} ${plan.depthMm + 1000}`} style={{display:'block',width:`${drawingZoom*100}%`,height:`${drawingZoom*65}vh`,maxWidth:'none'}}>
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
      </div>
      <ResizableSidebar style={{ padding: 12, borderLeft: '1px solid #ddd8cc', background: '#fff', overflowY: 'auto' }}>
        {/* 次へ（D-04 P4）: 工事原価が出ているかを含めて確かめる。止めない（問題は一覧で出し、選ぶのは利用者） */}
        <div style={{ marginBottom: 12 }}>
          <button data-tutorial="tutorial-p4-next" type="button" onClick={() => onNext?.()} style={{ width: '100%', padding: 8, border: '1px solid #1f2a44', borderRadius: 6, background: '#1f2a44', color: '#fff', font: 'inherit', cursor: 'pointer' }}>
            次へ（出力）
          </button>

        </div>
        <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>計上済み金額（概算）</h3>
          <p style={{color:"#a33",fontSize:12}}>未参照・未拾い・単価未入力の項目は含みません。建物全体の見積額ではありません。</p>
        {estimate && !('error' in estimate) ? (
          <>
            <p style={{ fontSize: 20, margin: '0 0 8px' }}>
              {yen(estimate.total_yen)}
              {estimate.provisional && <span style={{ color: '#a33', fontSize: 12 }}> 未確定を含む</span>}
            </p>
            {CATEGORIES.map(category=>{const costs=recordPage([...estimate.lines,...estimateLines.filter(l=>l.amountYen===null).map(l=>({price_id:l.lineId,category:l.category,yen:null,provisional:l.provisional}))].filter(l=>l.category===category),costPages[category]??0);return <details key={category} open={!!openCosts[category]} onToggle={e=>{const open=e.currentTarget.open;setOpenCosts(old=>old[category]===open?old:{...old,[category]:open})}} style={{marginBottom:10,borderBottom:'1px solid #e0e5eb',paddingBottom:8}}>
              <summary style={{cursor:'pointer',fontWeight:600}}>{category}<span style={{float:'right'}}>{yen(estimate.subtotals[category].yen)}{estimate.subtotals[category].provisional?' ※':''}</span></summary>
              {openCosts[category]&&<>
              <RecordPagination label={`${category}の計上内訳`} {...costs} onPage={page=>setCostPages(old=>({...old,[category]:page}))}/>
              <div style={{overflowX:'auto'}}><table aria-label={`${category}の計上内訳`} style={{width:'100%',minWidth:620,fontSize:12,borderCollapse:'collapse'}}>
                <thead><tr>{['項目','数量','単位','単価','金額','補足'].map(h=><th key={h} align="left">{h}</th>)}</tr></thead>
                <tbody>{costs.items.map((line,index)=>{
                  const detail=estimateLines.find(l=>l.lineId===line.price_id)
                  const spec=detail?.specification
                  const price='rows' in parsed?parsed.rows.find(p=>p.id===line.price_id):undefined
                  const fixture=estimateFixtureCost(unselectedFixtures,parseUnitPrices(fixtureUnitPriceTexts)).rows.find(r=>`fixture:${r.item}`===line.price_id)
                  const quantity=spec?.quantity??(price?quantityByPrice.get(line.price_id):detail?.quantity)??fixture?.count
                  const unit=spec?.unit??(price?.kind==='労務'?estimateLines.find(l=>l.unitPriceRef===price.id)?.unit:price?.unit)??detail?.unit??(fixture?'台':'—')
                  const unitPrice=spec?.unitPrice??(price?price.unit_price*(price.kind==='労務'?(price.factor??1):1):fixture?.unitPrice)
                  const note=spec?`${spec.priceStatus}／${spec.source}`:price?`${price.source_ref}${price.kind==='労務'?`／${price.unit_price}円/${price.unit} × 歩掛${price.factor}`:''}`:detail?.source??'什器の保存済み単価'
                  return <tr key={`${line.price_id}-${index}`} data-cost-line="true" style={{borderBottom:'1px solid #eee'}}>
                    <td style={{padding:'6px 4px'}}>{spec?.name??price?.item??detail?.item??fixture?.label??line.price_id}</td>
                    <td>{quantity?.toLocaleString('ja-JP',{maximumFractionDigits:3})??'—'}</td><td>{unit}</td>
                    <td>{unitPrice==null?'未設定':yen(unitPrice)}</td><td style={{whiteSpace:'nowrap'}}>{line.yen==null?'未計上':yen(line.yen)}{line.provisional?' ※':''}</td><td>{note}</td>
                  </tr>
                })}{!costs.total&&<tr><td colSpan={6}>明細なし</td></tr>}</tbody>
              </table></div>
              </>}
            </details>})}
            <p style={{ color: '#666', fontSize: 12 }}>直接仮設・共通仮設費・現場管理費・一般管理費は含めない。円単位の概算。</p>
          </>
        ) : (
          <p style={{ color: '#a33' }}>{estimate && 'error' in estimate ? estimate.error : '—'}</p>
        )}
        <EstimateCsvPanel objects={specObjects} selections={specSelections}/>
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
