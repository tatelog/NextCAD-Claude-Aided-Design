import { FloorPlanMenu } from './FloorPlanMenu'
import { useLeftPanelWidth, LeftPanelResize } from './LeftPanelResize'
import { fitFloorPlan } from '../plan/fitFloorPlan'
import { inheritedFloors } from '../plan/inheritedFloors'
import { useFloorPlans } from '../store/floorPlans'
// P3 平面（D-04 P3、D-02 C6、A-03 G17）。柱割りの通り芯と、廊下の両側の住戸候補から住戸数を出す。
// 区画の作り方は仮置き（candidateCells）。既定スパンと許容範囲は未決。画面では利用者が入れた値だけで計算する。
import { useEffect, useMemo, useRef, useState } from 'react'
import { checkSpan, gridLines } from '../plan/grid'
import { spanDimensions } from '../plan/spanDimension'
import { mmLabel } from '../plan/dimensionLabel'
import { milestoneSummary } from '../plan/milestone'
import { type CorridorLayout } from '../plan/candidateCells'
import { missingDimensionOf, missingTargetOf, plainErrorTextOf } from '../plan/inputProblem'
import { outlineFitTextOf } from '../plan/outlineFit'
import { useP3Field } from './useP3Field'
import { corridorDefaultOf } from '../plan/corridorDefaults'
import type { RoomPattern } from '../plan/rooms'
import { countUnits } from '../plan/units'
import type { ObjectKind } from '../plan/objectMenu'
import type { ObjectDetailSources } from '../plan/objectDetail'
import { parseCoreRect } from '../plan/coreRect'
import { generateAutoPlan, type AutoPlan, type StairFinish } from '../plan/autoPlan'
import { confirmRows, countByStatus, targetSegmentsOf } from '../plan/semanticConfirm'
import { nextGateOf, p3NextIssuesOf, type CheckIssue } from '../plan/nextCheck'
import { NextCheckPanel } from './NextCheckPanel'
import { recordWorkLog } from '../app/workLogStore'
import { p2Entries, useDrawing } from '../store/drawing'
import { useFixtures } from '../store/fixtures'
import { useSemantic } from '../store/semantic'
import { useSite } from '../store/site'
import { useUi } from '../store/ui'
import { FixtureLayer } from './FixtureLayer'
import { FixturePalette } from './FixturePalette'
import { MiniMap } from './MiniMap'
import { boundsOf } from './mapBounds'
import { P3Canvas } from './P3Canvas'
import { PenToolbar } from './PenToolbar'
import { ResizableObjectMenu as ObjectMenu } from './ObjectMenu'
import { objectMenuFoldedByDefault, useObjectMenuFold } from './objectMenuFold'
import { SemanticConfirm } from './SemanticConfirm'
import { DrawingReviewTile } from './DrawingReviewTile'
import { PANEL_TILES, usePanelTiles } from '../store/panelTiles'
import { PanelTile } from './PanelTile'
import { ChatTile } from './ChatTile'
import { FeatureAdjustTile } from './FeatureAdjustTile'
import { checkShaftAlignment } from '../plan/shaftAlignment'
import { shaftFloorsOf } from '../plan/shaftCheck'
import { isRightItemShown, useActiveMode } from '../store/mode'
import { SCREEN_MODES } from '../app/screenModes'
import { copyFixturesToSameType, psOfUnit, sameTypeUnitIds, unitDetailOf } from '../plan/unitDetail'
import { objectTableOf, type ObjectTableInput } from '../plan/objectTable'
import { sourcesOfTable } from '../plan/objectCountsOfTable'
import { useObjectTable } from '../store/objectTable'
import { roomsOfCells } from '../plan/rooms'
import { kindCountsIn, type KindPoint } from '../plan/unitWalls'
import { balconyOfUnit } from '../plan/balcony'
import { firstFloorCountsOf } from '../plan/commonAreas'
import { outlineArcsOf } from '../volume/outlineArcs'
import { gridSegmentsToArc, svgArcPath } from '../volume/curvedGrid'
import { cellsInsideArc } from '../plan/arcCells'
import { wallOutlineRings } from '../plan/wallUnion'
import { useFirstFloor } from '../store/firstFloor'
import { UnitDetailPanel } from './UnitDetailPanel'
import unitTypeCandidates from '../plan/unitTypeCandidates.json'
import { masterOf, unitTypeKind, unitTypeOptions } from '../plan/unitTypeMaster'
import { useDevTools } from '../store/devTools'

/** 住戸タイプのマスタ（T-08。候補 14 型。未確認の値は仮置き） */
const UNIT_TYPES = masterOf(unitTypeCandidates)

export function P3Plan({ onNext }: { onNext?: () => void } = {}) {
  const leftWidth = useLeftPanelWidth((s) => s.width)
  const devShown = useDevTools((s) => s.shown)
  const [widthText, setWidthText] = useP3Field('widthText')
  const [depthText, setDepthText] = useP3Field('depthText')
  // 廊下幅の既定は廊下タイプから（G135。中廊下 1,600 mm の仮置き）。既定の無い層は 2,000 mm のまま
  const [corridorText, setCorridorText] = useP3Field('corridorText')
  const [unitDepthText, setUnitDepthText] = useP3Field('unitDepthText')
  const [spanText, setSpanText] = useP3Field('spanText')
  const [minText, setMinText] = useP3Field('minText')
  const [maxText, setMaxText] = useP3Field('maxText')
  const [layoutText, setLayoutText] = useP3Field('layoutText')
  // 階段室型のしつらえ（統括の決定 G107）: 屋内シャフト（既定）か外部階段（アルミスリット 2 面）
  const [stairFinishText, setStairFinishText] = useP3Field('stairFinishText')
  // 住戸タイプ（G89）: 縦割り（柱割りの列）ごとに、型の id を , で並べる。型が少なければ繰り返す
  const [unitTypeIdsText, setUnitTypeIdsText] = useP3Field('unitTypeIdsText')
  const unitTypeIds = unitTypeIdsText.split(',').map((s) => s.trim()).filter((s) => s !== '')
  const firstUnitType = UNIT_TYPES.find((t) => t.id === unitTypeIds[0])
  const unitType = firstUnitType ? unitTypeKind(firstUnitType) : 'ファミリー'
  const [patternText, setPatternText] = useP3Field('patternText')
  const [targetText, setTargetText] = useP3Field('targetText')
  const [coreText, setCoreText] = useP3Field('coreText')
  // 階数・階高は P2（ボリューム）の値を使う
  const storeyCount = useDrawing((s) => s.storeyCount)
  const storeyHeightMm = useDrawing((s) => s.storeyHeightMm)
  const [evCountText, setEvCountText] = useP3Field('evCountText')
  const sourceVolume = useSite((s) => s.volume)
  const boundaries = useSite((s) => s.slopeBoundaries)
  const inherited = useMemo(() => inheritedFloors(sourceVolume ? { ...sourceVolume, storey_count: storeyCount, storey_height: storeyHeightMm } : null, boundaries ?? []), [sourceVolume, boundaries, storeyCount, storeyHeightMm])
  const sourceKey = JSON.stringify([sourceVolume, boundaries, storeyCount, storeyHeightMm])
  const floorState = useFloorPlans()
  const selectedFloor = Math.min(storeyCount, floorState.selected)
  const floorOutline = inherited?.floors[selectedFloor - 1] ?? []
  const auto = floorState.source === sourceKey ? floorState.plans[selectedFloor] ?? null : null
  const setAuto = (plan: AutoPlan | null) => floorState.put(sourceKey, selectedFloor, plan)
  useEffect(() => {
    if (inherited) { setWidthText(String(inherited.widthMm)); setDepthText(String(inherited.depthMm)) }
  }, [inherited, setWidthText, setDepthText])
  useEffect(() => { useSite.getState().setPlan(auto) }, [auto])
  // 直前の自動作成が、P2 の外形の寸法を使ったか（使ったときは、外形に入る数と目標を比べる文言を出す。依頼 C）
  const [autoUsesOutline, setAutoUsesOutline] = useState(false)
  const showDimensions = useUi((s) => s.showDimensions)
  const showGrid = useUi((s) => s.showGrid)
  const showMiniMap = useUi((s) => s.showMiniMap)
  // ペンの道具の置き場は P2 と同じ店舗の値（上・左・独立。G52）
  const [autoError, setAutoError] = useState<string | null>(null)
  // 左メニュー（G55）: 選んだ種類（1 つだけ。もう一度押すと外れる）
  const [selectedKind, setSelectedKind] = useState<ObjectKind | null>(null)
  // 什器（G69）: 置いた什器と、パレットで選んでいる品目は店舗が持つ（P4 の数量に結ぶため）
  const fixtures = useFixtures((s) => s.fixtures)
  const selectedFixtureItem = useFixtures((s) => s.selectedItem)
  const selectFixtureItem = useFixtures((s) => s.selectItem)
  const placeSelectedFixture = useFixtures((s) => s.placeSelected)
  const removeFixtureById = useFixtures((s) => s.remove)
  const setFixtureUnitIds = useFixtures((s) => s.setUnitIds)
  // 意味づけの確認: 描いた線のうち F5・F9 の線の種類と状態は店舗が持つ。種類は人が選ぶ（判定は未接続）
  // 外形と意味づけは P2 の線だけ（P3 の線は店舗に入るが、この欄の対象にはまだ入れない）
  const drawnAll = useDrawing((s) => s.entries)
  const drawnEntries = useMemo(() => p2Entries(drawnAll), [drawnAll])
  const assignments = useSemantic((s) => s.assignments)
  const setSemanticKind = useSemantic((s) => s.setKind)
  const clearSemanticKind = useSemantic((s) => s.clearKind)
  // 確認欄の対象は P2 の F5・F9 と、P3 で描いた線（F9）。P2 の外形（F4）は入らない（G9・G14）
  const semanticRows = useMemo(() => confirmRows(targetSegmentsOf(drawnAll), assignments), [drawnAll, assignments])

  // 目標の戸数から、スパン数と建物の寸法を決め、幅・奥行・スパンの入力に入れる（EV は全階停止として縦の数を出す）
  // 画面の寸法の入力（mm）。空の欄は 0 になり、足りない項目として一文にする
  const dimensionsOf = () => ({
    widthMm: Number(widthText),
    depthMm: Number(depthText),
    corridorMm: Number(corridorText),
    unitDepthMm: Number(unitDepthText),
    spanMm: Number(spanText),
  })

  const placement = useUi(s => s.toolbarPlacement)
  const planViewport = useRef<HTMLDivElement>(null)
  const [planZoom, setPlanZoom] = useState(1)
  const [planDrawing, setPlanDrawing] = useState(false)
  const changeZoom = (factor: number) => setPlanZoom(z => Math.max(0.25, Math.min(8, z * factor)))
  useEffect(() => {
    const element = planViewport.current
    if (!element) return
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      setPlanZoom(z => Math.max(0.25, Math.min(8, z * (event.deltaY < 0 ? 1.1 : 1 / 1.1))))
    }
    element.addEventListener('wheel', wheel, {passive:false})
    return () => element.removeEventListener('wheel', wheel)
  }, [inherited !== null])
  const runAuto = (allFloors = false) => {
    // 足りない入力は、一文で言う（ZodError の JSON は出さない。依頼 2b）
    const problem = (targetText.trim() ? missingTargetOf(Number(targetText)) : null) ?? missingDimensionOf(dimensionsOf())
    if (problem !== null) {
      setAuto(null)
      setAutoError(problem)
      return
    }
    try {
      // P2 の外形が閉じた矩形なら、その幅・奥行きの中に割り付ける（依頼 C）。寸法は上書きしない。取れないときは今までどおり目標から寸法を決める
      if (!inherited || floorOutline.length < 3) throw new Error('この階のボリューム外形がありません')
      const outline = { widthMm: inherited.widthMm, depthMm: inherited.depthMm }
      const g = generateAutoPlan({
        targetPerFloor: targetText.trim() ? Number(targetText) : 1,
        storeyCount,
        storeyHeightMm,
        spanMm: Number(spanText),
        unitDepthMm: Number(unitDepthText),
        corridorMm: Number(corridorText),
        layout: layoutText,
        stairFinish: stairFinishText,
        unitType,
        unitTypes: UNIT_TYPES,
        unitTypeIds,
        orderedTypes: true,
        pattern: patternText,
        evCount: Number(evCountText),
        evStops: Array.from({ length: storeyCount }, (_, i) => i + 1),
        // 円弧の外形があるときは、四隅が円の内側の区画だけを作る（ハブ A-03 G5）
        outline,
      })
      const targets = allFloors ? inherited.floors.map((_, i) => i + 1) : [selectedFloor]
      const needsAdjustment: number[] = []
      for (const floor of targets) {
        const polygon = inherited.floors[floor - 1]!
        if (polygon.length < 3) { floorState.put(sourceKey, floor, null); continue }
        const plan = fitFloorPlan(g, polygon)
        plan.shortfall = targetText.trim() ? Math.max(0, Number(targetText) - plan.unitsPerFloor) : 0
        floorState.put(sourceKey, floor, plan)
        if ([...plan.cores, plan.corridor].some(cell => countUnits({ outline: polygon, corridors: [], cores: [], cells: [cell] }).excluded.some(e => e.reasons.includes('outside')))) needsAdjustment.push(floor)
      }
      setWidthText(String(g.widthMm))
      setDepthText(String(g.depthMm))
      setAutoUsesOutline(outline !== undefined)
      setAutoError(needsAdjustment.length ? `${needsAdjustment.join("・")}階は廊下・コアが外形からはみ出します。配置案の調整が必要です。` : null)
    } catch (e) {
      setAuto(null)
      setAutoError(plainErrorTextOf(e))
    }
  }

  const lines = useMemo(() => {
    try {
      return gridLines(Number(depthText), Number(spanText))
    } catch {
      return null
    }
  }, [depthText, spanText])

  const core = parseCoreRect(coreText)

  const units = useMemo(() => {
    if (!inherited || floorOutline.length < 3) return { cells: null, result: null, error: 'ボリュームの外形がありません' }
    const c = { corridor: auto?.corridor ?? { id: 'none', x0: 0, y0: 0, x1: 1, y1: 1 }, corridors: auto ? [auto.corridor] : [], cells: auto?.cells ?? [], voids: [] }
    const result = countUnits({ outline: floorOutline, corridors: c.corridors, cores: auto?.cores ?? [], cells: c.cells })
    return { cells: c, result, error: null }
  }, [inherited, floorOutline, auto])

  // いまの区画（住戸の区画候補）の id を店舗に知らせる。P4 が、区画が無くなった什器を「区画なし」に数えるのに使う
  const unitIds = useMemo(() => (units.cells ? units.cells.cells.map((c) => c.id) : []), [units.cells])
  useEffect(() => {
    setFixtureUnitIds(unitIds)
  }, [unitIds, setFixtureUnitIds])

  // 左メニュー（G55）: P3 の自動作成の結果から、種類ごとの件数と、選んだ種類の中身を出す。筆界は P1 の筆界がまだ入らないので 0 のまま（仮置き）
  // 什器（G69）は、店舗の一覧（置いた什器。区画なしも含む）をそのまま渡す
  // 節目の要約（D-04 P3 の右側）。敷地・法規適合・階数階高・スパン・住戸数。確認申請に要る情報がここで揃う
  const siteMatches = useSite((s) => s.matches)
  const shadowResult = useSite((s) => s.shadow)
  const hiddenTiles = usePanelTiles((s) => s.hidden)
  // 右パネルの項目は、今のモードと画面の組で決まる（G100・G95）。× で閉じた項目も出さない（G73）
  const activeMode = useActiveMode('P3')
  const tileShown = (id: string) => isRightItemShown(SCREEN_MODES, activeMode, 'P3', hiddenTiles, id)
  // 左のオブジェクト一覧の開閉（G55）。描画（システム）のモードは折りたたんで始める。モードが変わると既定に戻る
  const menuFold = useObjectMenuFold(`P3-${activeMode}`, objectMenuFoldedByDefault(activeMode, 'plan'))
  // 1F の共用部の名前（区画ごと。ハブ A-03 G75）
  const firstFloorNames = useFirstFloor((s) => s.names)
  // 描いた円弧の外形（P2 から。G5）。P3 の平面に外周の円弧として重ねる
  const outlineArcs = outlineArcsOf(drawnEntries)
  // 壁の輪郭（ハブ A-03 G4）。壁厚は仮置きで P5 の既定と同じ 200 mm。交わるところは和の輪郭にして、重なりを取り除く
  const wallPolys = wallOutlineRings(
    drawnEntries.flatMap((e) => e.segments).map((s) => ({ id: s.id, a: { x: s.x1, y: s.y1 }, b: { x: s.x2, y: s.y2 }, kind: assignments[s.id]?.kind ?? null })),
    200,
  )
  // 円弧の外形があるとき、区画は四隅が円の内側のものだけを表示する（ハブ A-03 G5。自動作成の数は矩形のまま）
  const arcCut = outlineArcs[0] && units.cells ? cellsInsideArc(units.cells.cells, outlineArcs[0]) : null
  const { hideTile, showTile } = usePanelTiles.getState()
  // ダブルクリックで開く住戸の詳細（ハブ A-03 G76）。閉じると null に戻る
  const [detailUnitId, setDetailUnitId] = useState<string | null>(null)
  const milestoneRows = useMemo(
    () =>
      milestoneSummary({
        zoneKnown: siteMatches !== null && siteMatches.length === 1,
        shadow: shadowResult,
        storeyCount,
        storeyHeightMm,
        spanCount: auto ? auto.spans : null,
        unitCount: units.cells ? units.cells.cells.length : 0,
      }),
    [siteMatches, shadowResult, storeyCount, storeyHeightMm, auto, units.cells],
  )

  // オブジェクト表（G58・G78）: 画面の状態（区画・外形・通り芯・コア枠・什器。自動作成の結果があれば、その住戸・部屋・縦シャフト・コア）から作った行。
  // 左の一覧の件数は、この表の行から数える。表（SQLite）には自動作成の行を書いて、表から読む
  const objectTableInput = useMemo<ObjectTableInput>(() => {
    return {
      cells: units.cells ? units.cells.cells : [],
      rooms: auto ? auto.rooms : [],
      shafts: auto ? auto.shaftRects : [],
      cores: auto ? auto.cores : [],
      corridors: units.cells ? units.cells.corridors : [],
      outline: floorOutline.length >= 3 ? floorOutline : null,
      siteBoundary: false,
      gridLines: auto ? lines ?? [] : [],
      fixtures,
    }
  }, [widthText, depthText, lines, auto, core.rect, units.cells, fixtures, floorOutline])
  const derivedObjectRows = useMemo(() => objectTableOf(objectTableInput), [objectTableInput])
  const countSources = useMemo(() => sourcesOfTable(derivedObjectRows), [derivedObjectRows])
  const objectRows = useObjectTable((s) => s.rows)
  const objectPersisted = useObjectTable((s) => s.persisted)
  useEffect(() => {
    void useObjectTable.getState().init()
  }, [])
  useEffect(() => {
    useObjectTable.getState().setRows(derivedObjectRows)
  }, [derivedObjectRows, objectPersisted])
  const objectSources = useMemo<ObjectDetailSources>(
    () => ({
      outlines: floorOutline.length >= 3 ? [{ x0: 0, y0: 0, x1: Number(widthText), y1: Number(depthText) }] : [],
      gridLines: auto ? lines ?? [] : [],
      cores: auto ? auto.cores : [],
      shafts: auto ? auto.shaftRects : [],
      corridors: units.cells ? units.cells.corridors : [],
      fixtures,
      units: units.cells ? units.cells.cells : [],
      // 自動作成の前は部屋が無い。空の配列ではなく未指定にして、住戸の部屋の数を「未算定」と出す（件数は 0 のまま）
      rooms: auto ? auto.rooms : undefined,
    }),
    [widthText, depthText, lines, auto, core.rect, units.cells, fixtures],
  )

  const range = minText !== '' && maxText !== '' ? { minMm: Number(minText), maxMm: Number(maxText) } : null
  // 縦シャフトの上下階の一致（G119）。今は各階が基準階の複製（G30）なので、個別の階を持つときだけ食い違いが出る
  const shaftCheck = auto && Array.from({ length: storeyCount }, (_, i) => floorState.plans[i + 1]).every(Boolean) ? checkShaftAlignment(Array.from({ length: storeyCount }, (_, i) => shaftFloorsOf(floorState.plans[i + 1]!.shaftRects, storeyCount)[i]!)) : null
  let judge: string = '許容範囲は未入力'
  if (range && Number.isFinite(range.minMm) && Number.isFinite(range.maxMm)) {
    try {
      judge = checkSpan(Number(spanText), range)
    } catch {
      judge = '入力エラー'
    }
  }

  const W = Number(widthText)
  const D = Number(depthText)

  // 次へ（D-04 P3。G158）: 押したとき、通り・住戸数・住戸の定義・縦シャフト・廊下幅・要確認を確かめる。問題が無ければ進む。あれば一覧を出し、直すか、このまま進むかを選ぶ（止めない）
  const [nextIssues, setNextIssues] = useState<CheckIssue[] | null>(null)
  const p3Issues = (): CheckIssue[] =>
    p3NextIssuesOf({
      spanJudge: judge,
      unitCount: units.cells ? units.cells.cells.length : 0,
      unitError: units.error,
      shaftAligned: shaftCheck ? shaftCheck.aligned : null,
      corridorMm: Number(corridorText),
      reviewCount: countByStatus(semanticRows).needs_review,
      provisionalSpanCount: auto ? auto.provisionalSpans.length : 0,
    })
  const clickNextP3 = () => {
    const issues = p3Issues()
    if (nextGateOf(issues) === 'go') onNext?.()
    else setNextIssues(issues)
  }
  const goNextP3Anyway = (issues: readonly CheckIssue[]) => {
    recordWorkLog({
      at: new Date().toISOString(),
      screen: 'P3',
      action: '次へ（要確認として残した）',
      target: issues.map((i) => `${i.area}: ${i.text}`).join(' / '),
      who: 'human',
    })
    setNextIssues(null)
    onNext?.()
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `max-content minmax(0, 1fr) 320px`, height: '100%' }}>
      <div style={{width:leftWidth,position:'relative',overflowY:'auto',borderRight:'1px solid #ddd8cc'}}>
        <LeftPanelResize />
        <FloorPlanMenu floors={inherited?.floors ?? []} plans={floorState.source === sourceKey ? floorState.plans : {}} widthMm={inherited?.widthMm ?? 1} depthMm={inherited?.depthMm ?? 1} selected={selectedFloor} onSelect={floorState.select} types={UNIT_TYPES} pattern={unitTypeIds} onPattern={(ids) => setUnitTypeIdsText(ids.join(','))} onApply={() => runAuto(true)} />
      <ObjectMenu
        sources={objectSources}
        countSources={countSources}
        selectedKind={selectedKind}
        onSelect={setSelectedKind}
        caption={`${selectedFloor}階の配置案の件数`}
        firstFloorCounts={firstFloorCountsOf(firstFloorNames)}
        objectRows={objectRows}
        folded={menuFold.folded}
        onToggleFold={menuFold.toggle}
      />
      </div>
      <div style={{ padding: 16, overflow: 'auto' }}>
        <label>表示階 <select value={selectedFloor} onChange={(e) => floorState.select(Number(e.target.value))}>
          {Array.from({ length: storeyCount }, (_, i) => <option key={i} value={i + 1}>{i + 1}階</option>)}
        </select></label>
        <p>{selectedFloor}階 · {auto ? 'この階の配置案' : '配置未作成'} · ボリュームの斜線処理後の外形</p>
        <div style={{display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginBottom:8}}>
          <button type="button" aria-label="平面図を縮小" onClick={() => changeZoom(1 / 1.25)}>−</button>
          <span>{Math.round(planZoom * 100)}%</span>
          <button type="button" aria-label="平面図を拡大" onClick={() => changeZoom(1.25)}>＋</button>
          <button type="button" onClick={() => setPlanZoom(1)}>全体表示</button>
          <button type="button" aria-pressed={planDrawing} onClick={() => setPlanDrawing(v => !v)}>図面に描く</button>
        </div>
        <div style={{position:"relative"}}><PenToolbar placement={placement} /></div>
        {lines && units.cells ? (
          <div ref={planViewport} style={{ position: 'relative', overflow:'auto', height:'70vh', border:'1px solid #ddd8cc' }}>
          <div style={{position:'relative', width:`${planZoom * 100}%`, aspectRatio:`${W + 2500} / ${D + 2500}`}}>
          <svg width="100%" height="100%" viewBox={`-500 -500 ${W + 2500} ${D + 2500}`} style={{display:'block', background:'#fff'}}>
            {showGrid ? (
              <g stroke="#e3e6df" strokeWidth={6}>
                {Array.from({ length: Math.floor(W / 1000) + 1 }, (_, i) => (
                  <line key={`gx${i}`} x1={i * 1000} y1={0} x2={i * 1000} y2={D} />
                ))}
                {Array.from({ length: Math.floor(D / 1000) + 1 }, (_, i) => (
                  <line key={`gy${i}`} x1={0} y1={i * 1000} x2={W} y2={i * 1000} />
                ))}
              </g>
            ) : null}
            <polygon points={floorOutline.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#1f2a44" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            {showDimensions ? (
              <g stroke="#1f5f8b" strokeWidth={12} fontSize={Math.max(W, D) / 65} fill="#1f5f8b">
                <line x1={0} y1={D + 700} x2={W} y2={D + 700} />
                <text x={W / 2} y={D + 1000} textAnchor="middle">{mmLabel(W)}</text>
                <line x1={W + 700} y1={0} x2={W + 700} y2={D} />
                <text x={W + 1000} y={D / 2} textAnchor="start">{mmLabel(D)}</text>
                {/* 通り芯のスパン（奥行き方向。右側の寸法の列） */}
                {spanDimensions(auto ? lines : []).map((s) => (
                  <g key={`gs${s.fromMm}`}>
                    <line x1={W + 1700} y1={s.fromMm} x2={W + 1700} y2={s.toMm} />
                    <text x={W + 2000} y={(s.fromMm + s.toMm) / 2} textAnchor="start">{mmLabel(s.lengthMm)}</text>
                  </g>
                ))}
                {/* 住戸の幅（幅方向。下側の寸法の行）。住戸の区画の境界で測る */}
                {spanDimensions(units.cells.cells.flatMap((c) => [c.x0, c.x1])).map((s) => (
                  <g key={`gu${s.fromMm}`}>
                    <line x1={s.fromMm} y1={D + 1700} x2={s.toMm} y2={D + 1700} />
                    <text x={(s.fromMm + s.toMm) / 2} y={D + 2000} textAnchor="middle">{mmLabel(s.lengthMm)}</text>
                  </g>
                ))}
              </g>
            ) : null}
            {units.cells.corridors.map((k) => (
              <rect key={k.id} x={k.x0} y={0} width={k.x1 - k.x0} height={D} fill="#eee" />
            ))}
            {auto && core.rect ? (
              <rect x={core.rect.x0} y={core.rect.y0} width={core.rect.x1 - core.rect.x0} height={core.rect.y1 - core.rect.y0} fill="#e6f2ed" stroke="#1f2a44" strokeWidth={20} />
            ) : null}
            {auto ? auto.cores.map((c) => (
              <rect key={c.id} x={c.x0} y={c.y0} width={c.x1 - c.x0} height={c.y1 - c.y0} fill={c.id === 'evHall' ? '#dfe9f5' : '#e6f2ed'} stroke="#1f2a44" strokeWidth={20} />
            )) : null}
            {auto ? auto.shaftRects.map((s) => (
              <rect key={s.id} x={s.x0} y={s.y0} width={s.x1 - s.x0} height={s.y1 - s.y0} fill={s.kind === 'PS' ? '#f3e3b8' : '#d9c48a'} stroke="#7a5a10" strokeWidth={12} />
            )) : null}
            {(arcCut ? arcCut.inside : units.cells.cells).map((c) => (
              <rect key={c.id} x={c.x0} y={c.y0} width={c.x1 - c.x0} height={c.y1 - c.y0} fill="none" stroke="#8a8478" strokeWidth={20} />
            ))}
            <FixtureLayer cells={units.cells.cells} fixtures={fixtures} active={selectedFixtureItem !== null} onTap={placeSelectedFixture} onRemove={removeFixtureById} onDetail={setDetailUnitId} />
            {/* 壁（意味づけが wall の線）を、中心線から両側に壁厚の半分ずつ広げた輪郭で描く。交わるところは和の輪郭（ハブ A-03 G4） */}
            {/* 輪郭（外側と穴）は一つのパスで塗る。穴を別の多角形で塗ると、穴まで埋まる */}
            {wallPolys.length > 0 && (
              <path
                d={wallPolys.map((poly) => poly.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z').join(' ')}
                fill="#6b6459"
                fillOpacity={0.85}
                fillRule="evenodd"
              />
            )}
            {/* 通りは、描いた円弧の外形に当たるところで止める（ハブ A-03 G5）。円弧が無ければ全長のまま */}
            {(auto ? lines : []).map((y) => {
              const cut = outlineArcs[0] ? gridSegmentsToArc(outlineArcs[0], 'y', y, { x0: 0, x1: W, y0: 0, y1: D }) : null
              const seg = cut ? cut[0]! : { a: { x: -200, y }, b: { x: W + 200, y } }
              return <line key={y} x1={seg.a.x} y1={seg.a.y} x2={seg.b.x} y2={seg.b.y} stroke="#c44" strokeWidth={10} strokeDasharray="200 150" />
            })}
            {/* 描いた円弧の外形（P2 で 3 点・数値で入れた円弧）。外周の通り芯の円弧として重ねる（ハブ A-03 G5） */}
            {outlineArcs.map((arc, i) => (
              <path key={`outline-arc-${i}`} d={svgArcPath(arc)} fill="none" stroke="#1f5f8b" strokeWidth={20} />
            ))}
          </svg>
          <P3Canvas overlay drawing={planDrawing} viewBox={{x:-500,y:-500,width:W+2500,height:D+2500}} />
          </div>
          {showMiniMap && units.cells ? (() => {
            const rect = (r: { x0: number; y0: number; x1: number; y1: number }) => [
              { x: r.x0, y: r.y0 },
              { x: r.x1, y: r.y0 },
              { x: r.x1, y: r.y1 },
              { x: r.x0, y: r.y1 },
            ]
            const polys = [floorOutline, ...units.cells.corridors.map(rect), ...units.cells.cells.map(rect)]
            const b = boundsOf(polys)
            return b ? <MiniMap bounds={b} polygons={polys} /> : null
          })() : null}
          </div>
        ) : (
          <p style={{ color: '#a33' }}>{units.error ?? '入力を確かめてください'}</p>
        )}

      </div>
      <aside style={{ padding: 12, borderLeft: '1px solid #ddd8cc', background: '#fff', overflowY: 'auto' }}>
        <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>平面（柱割り・住戸数）</h2>
        {Object.keys(hiddenTiles).length > 0 ? (
          <p style={{ fontSize: 12, color: '#666', margin: '0 0 8px' }}>
            閉じた項目:{' '}
            {Object.keys(hiddenTiles).map((id) => (
              <button key={id} type="button" onClick={() => showTile(id)} style={{ marginRight: 6, fontSize: 12 }}>
                {PANEL_TILES.find((t) => t.id === id)?.title ?? id} を戻す
              </button>
            ))}
          </p>
        ) : null}
        {!tileShown('p3-form') ? null : (
        <PanelTile title="廊下・寸法の入力" onHide={() => hideTile('p3-form')}>
        <label style={{ display: 'block', marginBottom: 4 }}>
          廊下タイプ
          <select
            value={layoutText}
            onChange={(e) => {
              const next = e.target.value as CorridorLayout
              setLayoutText(next)
              // 層を変えたら、その層の既定の廊下幅に合わせる（既定の無い層は変えない。G135）
              const d = corridorDefaultOf(next)
              if (d) setCorridorText(String(d.mm))
            }}
            style={{ width: '100%' }}
          >
            <option value="中廊下">中廊下</option>
            <option value="片廊下">片廊下</option>
            <option value="階段室">階段室型</option>
            <option value="ツイン">ツインコリドー</option>
          </select>
        </label>
        {layoutText === '階段室' ? (
          <label style={{ display: 'block', marginBottom: 4 }}>
            階段室のしつらえ
            <select value={stairFinishText} onChange={(e) => setStairFinishText(e.target.value as StairFinish)} style={{ width: '100%' }}>
              <option value="indoorShaft">屋内シャフト（全部屋内）</option>
              <option value="outdoorSlit">外部階段（4 面のうち 2 面がアルミスリット）</option>
            </select>
          </label>
        ) : null}
        <label style={{ display: 'block', marginBottom: 6 }}>
          目標の戸数
          <input value={targetText} onChange={(e) => setTargetText(e.target.value)} placeholder="未入力" style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          建物の幅 (mm)
          <input value={widthText} readOnly style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          建物の奥行 (mm)
          <input value={depthText} readOnly style={{ width: '100%' }} />
        </label>
        </PanelTile>
        )}
        <label style={{ display: 'block', marginBottom: 4 }}>
          廊下の幅 (mm)
          <input value={corridorText} onChange={(e) => setCorridorText(e.target.value)} style={{ width: '100%' }} />
          {corridorDefaultOf(layoutText) && corridorText === String(corridorDefaultOf(layoutText)?.mm) ? (
            <span style={{ display: 'block', fontSize: 11, color: '#a86b00' }}>既定の値は仮置き</span>
          ) : null}
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          住戸の奥行 (mm)
          <input value={unitDepthText} onChange={(e) => setUnitDepthText(e.target.value)} style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          スパン (mm)
          <input value={spanText} onChange={(e) => setSpanText(e.target.value)} style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          許容範囲 最小 (mm)
          <input value={minText} onChange={(e) => setMinText(e.target.value)} placeholder="未入力" style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 10 }}>
          許容範囲 最大 (mm)
          <input value={maxText} onChange={(e) => setMaxText(e.target.value)} placeholder="未入力" style={{ width: '100%' }} />
        </label>
        <fieldset style={{ border: '1px solid #ddd8cc', padding: 8, margin: '0 0 10px' }}>
          <legend style={{ fontSize: 12 }}>EV コアの矩形（任意・mm。四隅すべて入れると区画の除外判定に使う）</legend>
          {(['x0', 'y0', 'x1', 'y1'] as const).map((k) => (
            <label key={k} style={{ display: 'inline-block', width: '48%', marginBottom: 4, fontSize: 12 }}>
              {k}
              <input value={coreText[k]} onChange={(e) => setCoreText({ ...coreText, [k]: e.target.value })} style={{ width: '100%' }} />
            </label>
          ))}
          {core.error ? <p style={{ color: '#a33', fontSize: 12, margin: '4px 0 0' }}>{core.error}</p> : null}
        </fieldset>
        {!tileShown('auto') ? null : (
        <PanelTile title="自動で作る（柱割り・間取り・縦シャフト）" onHide={() => hideTile('auto')}>
        <fieldset style={{ border: '1px solid #ddd8cc', padding: 8, margin: '0 0 10px' }}>
          <legend style={{ fontSize: 12 }}>自動で作る（柱割り・間取り・縦シャフト）</legend>
          <p style={{ margin: '0 0 6px', fontSize: 12 }}>
            階数・階高はボリュームの値を使う（{storeyCount} 階・階高 {storeyHeightMm} mm）
          </p>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
            EV の基数（全階停止）
            <input value={evCountText} onChange={(e) => setEvCountText(e.target.value)} style={{ width: '100%' }} />
          </label>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
            住戸タイプ（縦割りごと。ID を , で区切る。型が少なければ繰り返す）
            <input list="unit-type-options" value={unitTypeIdsText} onChange={(e) => setUnitTypeIdsText(e.target.value)} style={{ width: '100%' }} />
            <datalist id="unit-type-options">
              {unitTypeOptions(UNIT_TYPES).map((o) => (
                <option key={o.value} value={o.value} label={o.label} />
              ))}
            </datalist>
          </label>
          {auto ? (
            <>
              <p style={{ fontSize: 12, margin: '0 0 6px' }}>
                住戸タイプ（柱列をまとめた単位。間口の整数倍の最小の範囲）: {unitTypeIds.length === 0 ? '未指定（列ごとの区画）' : auto.spanTypes.map((id, i) => `${i + 1} 列目 ${UNIT_TYPES.find((t) => t.id === id)?.name ?? '—'}`).join('、')}
              </p>
              <p style={{ fontSize: 12, margin: '0 0 6px' }}>住戸数は間口 × 列幅から決まる。</p>
              {auto.provisionalSpans.length > 0 ? (
                <p style={{ fontSize: 12, margin: '0 0 6px', color: '#a86b00' }}>
                  要確認（仮の間口。間口が未確認の型、または範囲に入らない列）: {auto.provisionalSpans.map((k) => `${k + 1} 列目`).join('、')}
                </p>
              ) : null}
              {auto.absorbedSpans.length > 0 ? (
                <p style={{ fontSize: 12, margin: '0 0 6px', color: '#a86b00' }}>
                  要確認（余りの列を前の住戸に含めて幅を広げた）: {auto.absorbedSpans.map((k) => `${k + 1} 列目`).join('、')}
                </p>
              ) : null}
              {unitTypeIds.some((id) => UNIT_TYPES.find((t) => t.id === id)?.frontage_mm === null) ? (
                <p style={{ fontSize: 12, margin: '0 0 6px', color: '#a86b00' }}>
                  間口が未確認の型（候補からは外さず、仮の間口で置く）: {unitTypeIds.filter((id) => UNIT_TYPES.find((t) => t.id === id)?.frontage_mm === null).map((id) => UNIT_TYPES.find((t) => t.id === id)?.name ?? id).join('、')}
                </p>
              ) : null}
            </>
          ) : null}
          {auto && auto.unsupportedSpans.length > 0 ? (
            <p style={{ fontSize: 12, margin: '0 0 6px', color: '#a86b00' }}>
              室数に合う割り付けが無い列（個室 3 以上は未対応）は、田の字で仮置き: {auto.unsupportedSpans.map((k) => `${k + 1} 列目`).join('、')}
            </p>
          ) : null}
          <label style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
            間取りパターン（ファミリー）
            <select value={patternText} disabled={unitType === '単独'} onChange={(e) => setPatternText(e.target.value as RoomPattern)} style={{ width: '100%' }}>
              <option value="田の字">田の字</option>
              <option value="縦長">縦長</option>
              <option value="角">角（両端の住戸だけ）</option>
            </select>
          </label>
          <button type="button" onClick={() => runAuto()}>
            {selectedFloor}階の配置案を作る
          </button>
          {autoError ? <p style={{ color: '#a33', fontSize: 12, margin: '4px 0 0' }}>{autoError}</p> : null}
          {auto ? (
            <dl style={{ fontSize: 12, margin: '6px 0 0' }}>
              <dt>柱割り</dt>
              <dd>
                {auto.spans} スパン（幅 {auto.widthMm} mm × 奥行 {auto.depthMm} mm）
              </dd>
              <dt>住戸（{selectedFloor}階）</dt>
              <dd>
                {!targetText.trim() ? `${auto.unitsPerFloor} 戸（配置案）` : autoUsesOutline
                  ? outlineFitTextOf(Number(targetText), auto.unitsPerFloor)
                  : `${auto.unitsPerFloor} 戸${auto.shortfall > 0 ? `（目標に ${auto.shortfall} 戸足りない）` : '（目標を満たす）'}`}
              </dd>
              <dt>縦シャフト</dt>
              <dd>
                PS {auto.shafts.ps}（住戸ごと）・EPS {auto.shafts.eps}・DS {auto.shafts.ds}（コア脇、仮置き）
              </dd>
              <dt>EV</dt>
              <dd>
                {auto.ev.ev_cores.length} 基・全 {auto.ev.storeys.length} 階停止
                {auto.ev.unreachable_storeys.length > 0 ? `（停止しない階 ${auto.ev.unreachable_storeys.join(', ')}）` : ''}。配置: 階段 A・B は廊下の両端、EV ホールは中央（長さ 3 m の仮置き）
              </dd>
            </dl>
          ) : null}
        </fieldset>
        </PanelTile>
        )}
        {!tileShown('fixtures') ? null : (
          <PanelTile title="什器" onHide={() => hideTile('fixtures')}>
            <FixturePalette selectedItem={selectedFixtureItem} onSelect={selectFixtureItem} fixtures={fixtures} unitIds={unitIds} onRemove={removeFixtureById} />
          </PanelTile>
        )}
        {!tileShown('p3-result') ? null : (
        <PanelTile title="住戸数・スパンの判定" onHide={() => hideTile('p3-result')}>
        <p>スパンの判定: {judge}</p>
        {shaftCheck ? <p style={{ color: shaftCheck.aligned ? '#666' : '#a86b00', fontSize: 12 }}>{shaftCheck.aligned ? '作成済みの各階で縦シャフトが一致' : '各階の縦シャフトの位置を確認してください'}</p> : null}
        {units.result ? (
          <>
            <p>
              住戸数（仮置きの区画）: <strong>{arcCut ? arcCut.inside.length : units.result.usable_count}</strong>
              {arcCut ? '（円弧の外形の内に入る区画だけ数える）' : ''}
              {units.result.plan_status === '成立' ? '' : '（不成立のため確定しない）'}
            </p>
            <p style={{ color: '#666', fontSize: 12 }}>
              目標 {targetText === '' ? '未入力' : `${targetText} 戸`}
              {targetText !== '' && units.result.plan_status === '成立'
                ? `（差 ${units.result.usable_count - Number(targetText)} 戸）`
                : ''}
            </p>
            <p style={{ color: '#666', fontSize: 12 }}>
              区画の作り方は仮置き（廊下タイプに従い、柱割りの通りごとに並べる）。除外: {units.result.excluded.length} 件
            </p>
          </>
        ) : null}
        <p style={{ color: '#666', fontSize: 12 }}>
          意味判定は、ヘッダーの「意味づけを判定」で送る。コアの枠: {core.rect ? '1 件（ev-1）を除外判定に使用' : '未入力（0 件）'}。
        </p>
        </PanelTile>
        )}
        <section style={{ marginBottom: 10 }}>
          <button type="button" onClick={clickNextP3}>
            次へ（積算）
          </button>
          {nextIssues !== null ? (
            <NextCheckPanel
              issues={nextIssues}
              goLabel="このまま進む（要確認として残す）"
              onStay={() => setNextIssues(null)}
              onGoAnyway={() => goNextP3Anyway(nextIssues)}
            />
          ) : null}
        </section>
        {!tileShown('milestone') ? null : (
          <PanelTile title="節目の要約" onHide={() => hideTile('milestone')}>
            <section style={{ marginBottom: 10 }}>
              <strong style={{ fontSize: 13 }}>節目の要約</strong>
              <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0' }}>
                {milestoneRows.map((r) => (
                  <li key={r.label} style={{ fontSize: 12, color: r.status === 'ng' ? '#c8412a' : undefined }}>
                    {r.status === 'ok' ? '済' : r.status === 'ng' ? '不適合' : '未'}　{r.label}：{r.note}
                  </li>
                ))}
              </ul>
            </section>
          </PanelTile>
        )}
        {!tileShown('semantic') ? null : (
          <PanelTile title="意味づけの確認" onHide={() => hideTile('semantic')}>
            <SemanticConfirm
              rows={semanticRows}
              onSelectKind={(id, kind) => (kind === null ? clearSemanticKind(id) : setSemanticKind(id, kind))}
              onConfirm={setSemanticKind}
            />
          </PanelTile>
        )}
        {!tileShown('drawing-review') ? null : (
          <PanelTile title="候補の確認（Drawing）" onHide={() => hideTile('drawing-review')}>
            <DrawingReviewTile />
          </PanelTile>
        )}
        {!tileShown('claude-chat') ? null : (
          <PanelTile title="Claude（チャット）" onHide={() => hideTile('claude-chat')}>
            <h2>Claude（チャット）</h2>
            <ChatTile screen="P3" />
          </PanelTile>
        )}
        {!tileShown('feature-adjust') || !devShown ? null : (
          <PanelTile title="機能の調整" onHide={() => hideTile('feature-adjust')}>
            <h2>機能の調整</h2>
            <FeatureAdjustTile screen="P3" />
          </PanelTile>
        )}
      </aside>
      {(() => {
        const cells = units.cells ? units.cells.cells : []
        const cell = cells.find((c) => c.id === detailUnitId)
        // 描いた線の中点と、その意味づけ（種類）から、住戸の中の壁と開口の数を出す（ハブ A-03 G76）
        const kindPoints: KindPoint[] = drawnEntries
          .flatMap((e) => e.segments)
          .map((s) => ({ x: (s.x1 + s.x2) / 2, y: (s.y1 + s.y2) / 2, kind: assignments[s.id]?.kind ?? null }))
        const kindCounts = cell ? kindCountsIn(cell, kindPoints) : undefined
        return (
          <UnitDetailPanel
            detail={detailUnitId && units.cells ? unitDetailOf(detailUnitId, { cells, corridors: units.cells.corridors, outline: { W, D }, fixtures }) : null}
            onClose={() => setDetailUnitId(null)}
            storeyCount={storeyCount}
            ceilingMm={2400}
            walls={kindCounts?.walls}
            openings={kindCounts?.openings}
            balcony={cell ? balconyOfUnit(cell, { outline: { W, D } }) : undefined}
            shaft={detailUnitId && auto ? psOfUnit(detailUnitId, auto.shaftRects) : undefined}
            firstFloorName={detailUnitId ? (firstFloorNames[detailUnitId] ?? null) : null}
            onSetFirstFloorName={(name) => {
              if (detailUnitId) useFirstFloor.getState().setName(detailUnitId, name)
            }}
            rooms={cell ? roomsOfCells([cell]).map((r) => r.kind) : []}
            sameTypeIds={detailUnitId ? sameTypeUnitIds(detailUnitId, cells) : []}
            onApplySameType={() => {
              if (detailUnitId) useFixtures.setState({ fixtures: copyFixturesToSameType(detailUnitId, cells, fixtures) })
            }}
          />
        )
      })()}
    </div>
  )
}
