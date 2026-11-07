import {useSolarSettings} from '../store/solarSettings'
import {useTutorial,tutorialDone} from '../tutorial/state'
import {tutorialSteps} from '../tutorial/steps'
import {VolumeDimensions} from './VolumeDimensions'
import {VolumePlanPanel} from './VolumePlanPanel'
import { northSlopeRule } from '../law/slopeRules'
import { districtsAndZonesName } from '../plateau/codelist'
import { placementAllowed } from '../volume/placementGuard'
import { useOrdinance } from '../store/ordinance'
import { OrientationCompass } from './OrientationCompass'
import { loadRoadData, useRoadData } from '../store/roadData'
import { associateRoads } from '../map/roadAssociation'
import { shadowExposure } from '../law/shadowDrawing'
import { BoxPlot } from './BoxPlot'
import { createPortal } from 'react-dom'
import {boxOutline} from '../volume/boxOutline'
import { visibleSlopeBoundaries, type SlopeVisibility } from './slopeVisibility'
import { rotatePlanPoint } from '../map/planningFrame'
import type { ConfirmedSite } from '../store/confirmedSite'
// P03 ボリューム作図（描く）。D-04 v7 の一枚目: 直線モード、閉合、階数・階高、押し出し。
// 斜線・日影・段状の切り取り・自動案・3D は次の一枚。
import { useEffect, useMemo, useRef, useState } from 'react'
import { findClosedOutline } from '../canvas/closure'
import { extrudeOrReason, type ExtrudeResult } from '../volume/extrudeResult'
import { NumericLineForm } from './NumericLineForm'
import { useFeatures } from '../store/features'
import { volumeAfterSlope } from '../volume/cutVolume'
import { legalSlopeFromInputs, NORTH_NEEDS_TRUE_NORTH, slopeRowReasonOf } from '../volume/legalSlope'
import { previewSetbackLines as setbackLines } from '../volume/setbackLines'
import { baselineLabelOf, baselineOutline, DEFAULT_WALL_THICKNESS_MM, type BaselineSide } from '../volume/baselineOutline'
import { rotateOutline, moveOutlineVertices } from '../canvas/outlineEdit'
import { ROTATION_STEPS, snapAngle, type RotationStep } from '../volume/rotation'
import { judgeSlope } from '../volume/slopeJudge'
import { sunWindow, judgeShadow } from '../law/shadowRegulation'
import { shadowDrawing, shadowDrawingSummary } from '../law/shadowDrawing'
import { cutFloorParts } from '../volume/slope'
import { sunShadowsOf, winterSunAt } from '../volume/sunShadow'
import { useUi } from '../store/ui'
import { MiniMap } from './MiniMap'
import { boundsOf } from './mapBounds'
import { shadowRuleFromOrdinance } from '../law/shadowOrdinance'
import { PROJECT_WARD } from '../law/shadowRule'
import { koutoAreaOf } from '../law/shadowKotoAreas'
import { chomeNameOf } from '../map/parcelInfo'
import { effectiveZoneOf, siteRuleFromDistricts } from '../law/siteRule'
import type { HeightDistrict } from '../law/shadowMeasure'

import { useSite } from '../store/site'
import type { Zone } from '../law/slopeRules'
import { judgeFar } from '../volume/farCheck'
import { p2Entries, useDrawing } from '../store/drawing'
import { CircleMenu } from './CircleMenu'
import { DrawingCanvas } from './DrawingCanvas'
import { DockedPenToolbar } from './DockedPenToolbar'
import { Volume3D } from './Volume3D'
import { shouldShowScene3DOf } from './volumeScene'
import { mapShownOf, neighborsShownOf, shadowShownOf } from './volumeDisplay'
import { HeaderIconButton } from './HeaderIconButton'
import { IconBuildings, IconMap, IconShadow, IconSlope } from './headerIcons'
import { overrunFloorsOf, slopeSheetsOf } from '../volume/slopeSurface'
import { SceneErrorBoundary } from './SceneErrorBoundary'
import { mapTilesOf } from '../map/gsiTiles'
import { PLANE_TRUE_NORTH } from '../map/parcelPlane'
import { neighborVolumes } from '../volume/neighborLocal'
import type { ObjectKind } from '../plan/objectMenu'
import { objectSourcesOfFootprint } from '../plan/objectSourcesOfPlan'
import { sourcesOfTable } from '../plan/objectCountsOfTable'
import { emptyObjectTableInput, objectTableOf } from '../plan/objectTable'
import { ResizableObjectMenu as ObjectMenu } from './ObjectMenu'
import { objectMenuFoldedByDefault, useObjectMenuFold } from './objectMenuFold'
import { TileClose } from './PanelTile'
import { ChatTile } from './ChatTile'
import { FeatureAdjustTile } from './FeatureAdjustTile'
import { DrawingReviewTile } from './DrawingReviewTile'
import { NextCheckPanel } from './NextCheckPanel'
import { nextGateOf, p2NextIssuesOf, type CheckIssue } from '../plan/nextCheck'
import { brokenFloorsOf } from '../volume/mesh'
import { recordWorkLog } from '../app/workLogStore'
import { usePanelTiles } from '../store/panelTiles'
import { isRightItemShown, useActiveMode, useMode } from '../store/mode'
import { SCREEN_MODES } from '../app/screenModes'
import { OrdinanceForm, OrdinanceStatusLine, ORDINANCE_KEYS } from './OrdinanceForm'

const m2 = (mm2: number) => (mm2 / 1_000_000).toLocaleString('ja-JP', { maximumFractionDigits: 2 })
import { lotAreaMm2, lotCenterOf, lotOf, roadEdgeIndexOf, slopeLotNoteOf } from '../plan/lot'
import { parcelPropsOf } from '../map/selectedParcel'
import { isConfirmedStaleOf, lotOfConfirmed, useConfirmedSite } from '../store/confirmedSite'
import { neighborVolumesInFrame } from '../volume/neighborFrame'
import { sunSiteOf } from '../plan/sunSite'
import { useDevTools } from '../store/devTools'

export function P03Volume({ onNext, onSelectSite }: { onNext?: () => void; onSelectSite?: () => void } = {}) {
  const [showRoadNumbers, setShowRoadNumbers] = useState(true)
  const [sideWidth, setSideWidth] = useState(260)
  const sideDrag = useRef<{ x: number; width: number } | null>(null)
  const devShown = useDevTools((s) => s.shown)
  // P2 の敷地: 確定した敷地の筆（P1 の「この敷地で確定」）。確定していなければダミー（統括の依頼 2026-11-06。1）
  const savedSite = useConfirmedSite((s) => s.confirmed)
  const [planningPreview, setPlanningPreview] = useState<ConfirmedSite | null>(null)
  const confirmed = planningPreview ?? savedSite
  const planningAngle = confirmed?.frame?.rotationDeg ?? 0
  const currentSite = useConfirmedSite((s) => s.currentSite)
  const currentUid = useSite((s) => s.parcelUid)
  const confirmedBuildings = useConfirmedSite((s) => s.buildings.data)
  // 日射・日影の地点（確定した敷地の中心。確定していなければ今までの固定の地点。統括の依頼 2026-11-06。3）
  const sunSite = sunSiteOf(confirmed?.center ?? null)
  const parcel = lotOfConfirmed(confirmed)
  // 確定した筆の地番（P1 の「選択した筆：地番 …」と同じ値。取れなければ null）。斜線の注記に使う（統括の依頼 2026-11-06）
  const parcelProps = confirmed?.parcelUid ? parcelPropsOf(confirmed.parcelUid) : undefined
  const chiban = parcelProps?.['地番'] ?? null
  const lot = lotOf(parcel)
  // 外形は P2 の線だけ（P3 の線は P3 の平面で扱う）
  const drawnAll = useDrawing((s) => s.entries)
  const entries = useMemo(() => p2Entries(drawnAll), [drawnAll])
  const segments = useMemo(() => entries.flatMap((e) => e.segments), [entries])
  const closure = useMemo(() => findClosedOutline(segments), [segments])
  // 左メニュー（G55）の入力: 外形（閉じた輪郭）と敷地（選んだ筆、無ければダミー）から
  const objectSources = useMemo(() => objectSourcesOfFootprint(closure.footprint, lot), [closure, lot])
  // 左の一覧の件数（G78）: 閉じた外形と仮の筆界の行から数える（別の集計表は作らない）
  const countSources = useMemo(
    () => sourcesOfTable(objectTableOf({ ...emptyObjectTableInput(), outline: closure.footprint, siteBoundary: true })),
    [closure],
  )
  const storeyCount = useDrawing((s) => s.storeyCount)
  const storeyHeightMm = useDrawing((s) => s.storeyHeightMm)
  const setStoreyCount = useDrawing((s) => s.setStoreyCount)
  const setStoreyHeightMm = useDrawing((s) => s.setStoreyHeightMm)
  const clear = useDrawing((s) => s.clear)
  const transform = useDrawing((s) => s.transform)
  const placement = useUi((s) => s.toolbarPlacement)
  // 既定は 3D（D-04 P2 の主画面、G42）。外形が閉じるまでは 3D に何も出ない（案内を出す）
  const [toolbarVisible, setToolbarVisible] = useState(true)
  const [headerSlots, setHeaderSlots] = useState<{display: HTMLElement; clear: HTMLElement} | null>(null)
  useEffect(() => {
    const display = document.getElementById('volume-display-controls')
    const clear = document.getElementById('volume-clear-control')
    if (display && clear) setHeaderSlots({display, clear})
  }, [])
  const [view, setView] = useState<'plan' | '3d'>('plan')
  const [panOnly, setPanOnly] = useState(false)
  const [selectOnly, setSelectOnly] = useState(true)
  const [boxPlot, setBoxPlot] = useState(false)
  const tutorial=useTutorial()
  const tutorialRoad=tutorial.active&&tutorialSteps[tutorial.index]?.target==='tutorial-road'
  useEffect(()=>{if(tutorialRoad){setView('plan');setShowRoadNumbers(true);setSelectOnly(true);setPanOnly(false);setBoxPlot(false)}},[tutorialRoad])
  const tutorialDrawing=tutorial.active&&tutorialSteps[tutorial.index]?.target==='tutorial-draw'
  useEffect(()=>{if(tutorialDrawing){setView('plan');setBoxPlot(true);setSelectOnly(false);setPanOnly(false)}else if(tutorial.active)setBoxPlot(false)},[tutorialDrawing,tutorial.active])
  const startDrawing = () => {
    setSelectOnly(false); setBoxPlot(false); setPanOnly(false); setView('plan'); useMode.getState().setMode('drawing') }
  // 左メニュー（G55）で選んだ種類（1 つだけ。もう一度押すと外れる）。2D 平面のときだけ出す（3D のときに出すかは未決）
  const [selectedKind, setSelectedKind] = useState<ObjectKind | null>(null)
  const [homeToken, setHomeToken] = useState(0)
  const siteBuildings = useSite((s) => s.buildings)
  const showShadow = useUi((s) => s.showShadow)
  const showNeighbors = useUi((s) => s.showNeighbors)
  const showDimensions = useUi((s) => s.showDimensions)
  const showMiniMap = useUi((s) => s.showMiniMap)
  // ボリューム画面の表示（代表の依頼 2026-11-06。1）。機能の調整（全体）と両方が入っているときに出る
  const volumeMap = useUi((s) => s.volumeMap)
  const volumeNeighbors = useUi((s) => s.volumeNeighbors)
  const volumeShadow = useUi((s) => s.volumeShadow)
  const setVolumeMap = useUi((s) => s.setVolumeMap)
  const setVolumeNeighbors = useUi((s) => s.setVolumeNeighbors)
  const setVolumeShadow = useUi((s) => s.setVolumeShadow)
  const volumeSlope = useUi((s) => s.volumeSlope)
  const [slopeVisibility, setSlopeVisibility] = useState<SlopeVisibility>({ north: true, road: true, adjacent: true })
  const setVolumeSlope = useUi((s) => s.setVolumeSlope)
  const neighborsOn = neighborsShownOf(showNeighbors, volumeNeighbors)
  const shadowOn = shadowShownOf(showShadow, volumeShadow)
  // 地面に貼る地理院タイル（確定した地点の周り。枠が無ければ無し。代表の依頼 2026-11-06。4）
  const mapTiles = useMemo(() => (confirmed ? mapTilesOf(confirmed.center, confirmed.frame) : []), [confirmed])
  const sitePoint = useSite((s) => s.sitePoint)
  const neighbors = useMemo(
    () => {
      // 確定した筆があれば、その筆の枠で置く（筆とずれない。統括の依頼 2026-11-06。2）。無ければ今までどおり
      if (confirmed?.frame) return confirmedBuildings ? neighborVolumesInFrame(confirmedBuildings, confirmed.frame) : []
      return siteBuildings && sitePoint ? neighborVolumes(siteBuildings, sitePoint, lotCenterOf(lot)) : []
    },
    [siteBuildings, sitePoint, lot, confirmed, confirmedBuildings],
  )

  
  const heightDistrict: HeightDistrict | '' = ''
  // 日射（G53）: 冬至（2026-12-22）の時刻（日本時間）。場所は確定した敷地の中心（確定していなければ江東区の点）
  const [solarTime, setSolarTime] = useState('12:00')
  const solarDate=useSolarSettings(s=>s.date)
  const setSolarDate=useSolarSettings(s=>s.setDate)
  // 時刻 → 冬至の太陽（sunShadow.ts。統括の指示 2026-11-06。5b）
  const sun = useMemo(() => winterSunAt(solarTime, sunSite, solarDate), [solarTime, sunSite, solarDate])
  const zone: Zone = '指定なし'
  // 前面道路の辺（P2 で選ぶ。店舗が持つので、確定の前に選んでも確定のまとめに入る。統括の依頼 2026-11-06。6）
  const roadData=useRoadData(s=>s.roads)
  const roadDataError=useRoadData(s=>s.error)
  useEffect(()=>{
    if(!confirmed?.lot || !confirmed.frame || confirmed.roadLinks) return
    if(!roadData && !roadDataError) { void loadRoadData().catch(()=>{}); return }
    useConfirmedSite.getState().attachRoadLinks(confirmed.parcelUid,associateRoads(confirmed.lot,confirmed.frame,roadData))
  },[confirmed,roadData,roadDataError])
  const roadEdge = useConfirmedSite((s) => s.roadEdge)
  // 前面道路の辺は、今の敷地の辺の範囲に収めて使う（統括の依頼 2026-11-06 (b)）
  const edge = roadEdgeIndexOf(lot, roadEdge)
  // 前面道路の幅員と出どころ（仮置き）は店舗が持つ。確定のまとめに入り、様式と空欄の一覧に出せる（統括の依頼 2026-11-06）
  const roadWidth = useConfirmedSite((s) => s.roadWidth)
  // 敷地との離れ（西・南）。入れると建物をその位置へ移す。北と東は建物の大きさで決まる（G67）
  // 離れ（西・南）の入力は空で始める。描いた外形は、離れを入れるまで動かない（t62 の直し）。既定（G104・G115）は入力欄の placeholder に出す
  // 基準線（ハブ A-03 G59・統括の依頼 t52）: 描いた外形（外壁の中心線）を、内側へ寄せるか、中心線から量（外へ正）だけずらす。既定は中心線・ずらし 0
  const [baselineSide, setBaselineSide] = useState<BaselineSide>('中心線')
  const [baselineOffsetText, setBaselineOffsetText] = useState('0')

  // 離れ（西・南）の入力があれば、建物をその位置へ移した外形を使う。空欄なら描いた位置のまま
  // 回転（G71）: 右パネルの角度（°）と刻み。「回す」で外形を重心のまわりに回し、store に確定する
  const [rotateText, setRotateText] = useState('0')
  const [rotateStep, setRotateStep] = useState<RotationStep>('free')
  // 機能のオンオフ（G70）: 回転の表示と操作、つまみ、斜線と日影の再計算
  const featureOn = useFeatures((s) => s.on)
  // 右パネルの節を閉じる（ハブ A-03 G73）。閉じた節は display: none で残し、入力の値は保つ
  const hiddenTiles = usePanelTiles((s) => s.hidden)
  const { hideTile } = usePanelTiles.getState()
  // 右パネルの項目は、今のモードと画面の組で決まる（G100・G95）。表に無い・使えないモードの項目は出さない
  const activeMode = useActiveMode('P2')
  const tileStyle = (id: string) => ({
    position: 'relative' as const,
    ...(isRightItemShown(SCREEN_MODES, activeMode, 'P2', hiddenTiles, id) ? {} : { display: 'none' as const }),
  })
  // 左のオブジェクト一覧の開閉（G55）。描画（システム）と 3D は折りたたんで始める。画面・モード・表示が変わると既定に戻る
  const menuFold = useObjectMenuFold(`P2-${activeMode}-${view}`, objectMenuFoldedByDefault(activeMode, view))
  const rotateDeg = snapAngle(Number(rotateText), rotateStep)
  // 3D の角の回転つまみ（G71）: つまんだ時点の外形（entries）を覚え、離したときに、その外形へ丸めた角度を 1 回だけ与えて確定する（Undo は 1 回で戻る）
  const knobSnapshotRef = useRef<typeof entries | null>(null)
  const onKnobRotateStart = () => {
    knobSnapshotRef.current = useDrawing.getState().entries
  }
  const onKnobRotate = (deg: number) => {
    const snapshot = knobSnapshotRef.current ?? useDrawing.getState().entries
    knobSnapshotRef.current = null
    transform(() => rotateOutline(snapshot, deg))
  }
  // 基準線（G59・t52）: 描いた外形（中心線）を、内側または中心線からの量で動かした線にする。数でない量は 0
  const baselineOffset = Number(baselineOffsetText)
  const baselineOpts = useMemo(
    () => ({ side: baselineSide, offsetMm: Number.isFinite(baselineOffset) ? baselineOffset : 0, wallThicknessMm: DEFAULT_WALL_THICKNESS_MM }),
    [baselineSide, baselineOffset],
  )
  const baseline = useMemo(() => {
    if (!closure.closed || closure.footprint === null) return null
    return baselineOutline(closure.footprint, baselineOpts)
  }, [closure, baselineOpts])
  const [dimensionFocus,setDimensionFocus]=useState(0)
  const placedFootprint = baseline?.ok ? baseline.footprint : null

  // 立体が作れないときは理由を持つ（黙って消さない。3D の場所と判定の文言に出す）
  const extruded = useMemo<ExtrudeResult | null>(() => {
    if (!closure.closed || placedFootprint === null) return null
    return extrudeOrReason({ footprint: placedFootprint, storey_count: storeyCount, storey_height: storeyHeightMm })
  }, [closure, placedFootprint, storeyCount, storeyHeightMm])
  const volume = extruded?.ok ? extruded.volume : null
  // 基準線で外形が消えるときは、その理由を出す（黙って 3D を消さない）
  const baselineError = baseline !== null && !baseline.ok ? baseline.reason : null
  const volumeError = baselineError ?? (extruded && !extruded.ok ? extruded.reason : null)

  // 法定の斜線を、敷地（選んだ筆、無ければダミー 20 m × 30 m）の辺に当てて切り取る。前面道路の辺・幅員・用途地域・容積率の限度は利用者が入れる
  // P1 で用途地域が一つに決まっていれば、その区分と容積率の限度を使う（PLATEAU）。無ければ利用者の入力
  const district = useConfirmedSite(s => s.district)
  const districtPoint = useConfirmedSite(s => s.districtPoint)
  const matchingDistrict = !!savedSite && districtPoint?.lat === savedSite.center.lat && districtPoint?.lon === savedSite.center.lon
  // P1の取得結果を直接使う。保存DBの起動・障害で計算条件を失わない。
  const siteMatches = (matchingDistrict ? district.data?.matches : null) ?? null
  useEffect(() => {
    if (!savedSite) return
    const state = useConfirmedSite.getState()
    const same = state.districtPoint?.lat === savedSite.center.lat && state.districtPoint?.lon === savedSite.center.lon
    if (same && (state.district.data || state.district.loading || state.district.error)) return
    const cityCode = savedSite.cityCode
    if (cityCode) void state.fetchDistrictAt(savedSite.center, cityCode)
  }, [savedSite?.center.lat, savedSite?.center.lon])
  const siteRule = useMemo(() => (siteMatches ? siteRuleFromDistricts(siteMatches) : null), [siteMatches])
  const effectiveZone = effectiveZoneOf(siteRule, zone)
  const inheritedZoneName = siteMatches?.length === 1 && siteMatches[0]?.function != null ? districtsAndZonesName(siteMatches[0].function) : undefined
  const northExcluded = siteRule !== null && northSlopeRule({zone: effectiveZone}).status === '対象外' 
  // 欄は、計算に使う区分を示す（PLATEAU の区分が決まっていれば、その区分で押せない。統括の依頼 2026-11-06）
  const effectiveFar = siteRule?.farPercent ?? null

  const legal = useMemo(() => {
    return legalSlopeFromInputs({
      footprint: lot,
      roadEdgeIndex: edge,
      roadWidthMm: Number(roadWidth) || 0,
      zone: effectiveZone,
      farPercent: effectiveFar,
      // 真北は、確定した筆がある（経緯度から平面を作った）ときだけ分かる。平面の +y が真北（parcelPlane.ts）。
      // ダミーの筆界では真北が分からないので渡さない（北側斜線は未判定。統括の指示 2026-11-06。5c）
      trueNorth: parcel ? rotatePlanPoint(PLANE_TRUE_NORTH, planningAngle) : undefined,
    })
  }, [effectiveFar, effectiveZone, edge, roadWidth, lot, parcel, planningAngle])

  const cut = useMemo(() => {
    if (!volume) return null
    return volumeAfterSlope(
      { footprint: volume.footprint, storey_count: volume.storey_count, storey_height: volume.storey_height },
      legal.boundaries,
      lotAreaMm2(lot),
    )
  }, [volume, legal, lot])

  // 敷地との離れ（敷地が矩形のときだけ。G67）
  // 離れの寸法線（G67）。3D の地面に出す。寸法線の表示をオフにしたら出さない
  const setbackLinesOfVolume = useMemo(() => (volume ? setbackLines(lot, volume.footprint) : null), [volume, lot])
  // 斜線の面と食い込み（統括の指示 2026-11-06。5a）。斜線の境界（legal）から作る。斜線の面の長さは、敷地の対角の長さ＋5 m
  const slopeExtentMm = useMemo(() => {
    const xs = lot.map((p) => p.x)
    const ys = lot.map((p) => p.y)
    return Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 5000
  }, [lot])
  // 制限面は建物の高さに依存させず、拡大前から敷地の範囲で表示する。
  const shownBoundaries = useMemo(() => visibleSlopeBoundaries(legal.boundaries, slopeVisibility), [legal, slopeVisibility])
  const slopeSheets = useMemo(
    () => slopeSheetsOf(shownBoundaries, slopeExtentMm, undefined, lot),
    [shownBoundaries, slopeExtentMm, lot],
  )
  const overrunFloors = useMemo(
    () => (volume && shownBoundaries.length > 0 ? overrunFloorsOf(volume.footprint, shownBoundaries, volume) : []),
    [volume, shownBoundaries],
  )
  // 道路斜線だけの判定（図書の「道路斜線」用。北側・隣地と分けて出す）
  const roadSlope = useMemo(() => {
    const road = legal.boundaries.filter((b) => b.kind === 'road')
    if (!volume || road.length === 0) return null
    return judgeSlope(volume.footprint, road, { storey_count: volume.storey_count, storey_height: volume.storey_height })
  }, [volume, legal])
  useEffect(() => {
    useSite.getState().setRoadSlope(roadSlope)
  }, [roadSlope])
  // 切り取った階ごとの形（階の天端までの立体）。斜線が無ければ階ごとに外形のまま
  const floorsAll = useMemo(() => {
    if (!volume) return []
    const floors =
      legal.boundaries.length > 0
        ? cutFloorParts(volume.footprint, legal.boundaries, volume)
        : Array.from({ length: volume.storey_count }, () => [volume.footprint])
    return floors.flatMap((parts, i) => parts.map(f => ({ footprint: f, heightMm: (i + 1) * volume.storey_height })))
  }, [volume, legal])
  const stackedFloors = useMemo(() => floorsAll.filter((b) => b.footprint.length >= 3), [floorsAll])
  // 立体にできない階（点が残っているのに壊れた階。斜線で全部切り取られた階は、壊れた階ではない）。次へのときの確かめに渡す
  // 点が 0 の階は brokenFloorsOf が除く（全部削られた階は出さない）
  const brokenFloors = useMemo(() => (volume ? brokenFloorsOf(floorsAll, volume.storey_height) : []), [floorsAll, volume])
  // 地面に落ちる日影（時刻の太陽の位置から、切り取った階ごとの影の形）。太陽が地平線の上のときだけ
  const sunShadow = useMemo(() => sunShadowsOf(stackedFloors, sun ? { ...sun, azimuthFromSouthDeg: sun.azimuthFromSouthDeg - planningAngle } : null), [stackedFloors, sun, planningAngle])
  const overviewShadows = useMemo(() => sunWindow(sunSite.lat, sunSite.lon, new Date(`${solarDate}T00:00:00Z`))
    .flatMap(sun => sunShadowsOf(stackedFloors, { ...sun, azimuthFromSouthDeg: sun.azimuthFromSouthDeg - planningAngle }) ?? []),
    [stackedFloors, sunSite.lat, sunSite.lon, planningAngle, solarDate])
  const automaticShadow = useMemo(() => {
    if (!volume) return null
    return shadowExposure({
      lot: lot.map(p => rotatePlanPoint(p, -planningAngle)),
      buildings: stackedFloors.map(b => ({...b,footprint:b.footprint.map(p=>rotatePlanPoint(p,-planningAngle))})),
      lat:sunSite.lat,lon:sunSite.lon,date:new Date(Date.UTC(2026,11,22)),measurementHeightM:0,
    })
  }, [volume, stackedFloors, lot, planningAngle, sunSite])
  const ordinanceEntries = useOrdinance((s) => s.entries)
  // 測定面の候補（G87）。表から出す提案。確定するまで判定には使わない
  // 日影規制（冬至 8:00〜16:00）。切り取った階ごとの形で判定する。規制値が無い用途地域は対象外と出す。規制値は確認済みの条例の値だけ（G15）
  const shadowJudge = useMemo(() => {
    // 再計算をオフにしているときは、判定を計算せずに止めていると出す（G70）
    if (!featureOn.shadowRecalc) return { text: '再計算を止めている（機能のオンオフ）', result: null as '適合' | '不適合' | null }
    if (!volume) {
      return { text: volumeError ? `立体を作れないので判定できない（${volumeError}）` : '外形が閉じると判定する', result: null as '適合' | '不適合' | null }
    }
    // 規制値は、人が確認した条例の値だけで置く（G15）。未確認・未入力なら判定しない
    // 文脈（高度地区・区）を基準の表へ渡す（t29）。高度地区が未入力なら渡さない（従来どおり）
    const ordinance = shadowRuleFromOrdinance(effectiveZone, ordinanceEntries, {
      urfFunction: siteMatches?.length === 1 ? siteMatches[0]?.function ?? undefined : undefined,
      koudo: heightDistrict === '' ? undefined : heightDistrict === '第三種' ? '第三種' : 'その他',
      ward: PROJECT_WARD,
    })
    if (!ordinance.ok) return { text: ordinance.reason, result: null as '適合' | '不適合' | null }
    const judgment = judgeShadow({
      lot: lot.map((p) => rotatePlanPoint(p, -planningAngle)),
      buildings: stackedFloors.map((b) => ({ ...b, footprint: b.footprint.map((p) => rotatePlanPoint(p, -planningAngle)) })),
      rule: ordinance.rule,
      lat: sunSite.lat,
      lon: sunSite.lon,
      date: new Date(Date.UTC(2026, 11, 22)),
    })
    // 日影図（RC 造。切り取った階ごとの影を格子で数える）の一行を判定文に添える（t28）
    const drawingText = shadowDrawingSummary(
      shadowDrawing({
        structure: 'RC',
        lot: lot.map((p) => rotatePlanPoint(p, -planningAngle)),
        buildings: stackedFloors.map((b) => ({ ...b, footprint: b.footprint.map((p) => rotatePlanPoint(p, -planningAngle)) })),
        rule: ordinance.rule,
        lat: sunSite.lat,
        lon: sunSite.lon,
        date: new Date(Date.UTC(2026, 11, 22)),
      }),
    )
    if (judgment.result === '適合') return { text: `適合（確認済みの条例の値で判定）／${drawingText}`, result: '適合' as const }
    const w = judgment.worst!
    return { text: `不適合（最大 ${w.hours} h、境界から ${w.distanceM} m、上限 ${w.limit} h）／${drawingText}`, result: '不適合' as const }
  }, [volume, volumeError, effectiveZone, stackedFloors, featureOn.shadowRecalc, ordinanceEntries, heightDistrict, lot, sunSite, planningAngle, siteMatches])
  useEffect(() => {
    useSite.getState().setShadow(shadowJudge.result)
  }, [shadowJudge])
  // 外形と階を P4 に渡す（数量の自動拾い）
  useEffect(() => {
    useSite.getState().setVolume(volume ? { footprint: volume.footprint, storey_count: volume.storey_count, storey_height: volume.storey_height } : null)
  }, [volume])
  // 斜線の規則（切り取りの境界）を P4・P5 に渡す。切り取った階の面積は、P4・P5 が今の階数から計算する（統括の依頼 2026-11-06。依頼 B）
  useEffect(() => {
    useSite.getState().setSlopeBoundaries(legal.boundaries)
  }, [legal])

  const farJudgement = cut ? judgeFar(cut.floor_area_ratio, effectiveFar ?? undefined) : '—'

  const closureLabel = closure.closed
    ? '閉じている'
    : closure.reason === 'empty'
      ? 'まだ線が無い'
      : closure.reason === 'open'
        ? '閉じていない（端点がつながっていない）'
        : closure.reason === 'branch'
          ? '閉じていない（枝が出ている）'
          : '閉じていない（複数の輪）'

  // 次へ（D-04 P2。G158）: 押したとき、外形・斜線・日影・段状の形を確かめる。問題が無ければ進む。あれば一覧を出し、直すか、このまま進むかを選ぶ（止めない）
  const [nextIssues, setNextIssues] = useState<CheckIssue[] | null>(null)
  const p2Issues = (): CheckIssue[] =>
    p2NextIssuesOf({
      closed: closure.closed,
      promptUnknown: false,
      closureText: closureLabel,
      slope:
        !volume || legal.boundaries.length === 0
          ? null
          : judgeSlope(volume.footprint, legal.boundaries, { storey_count: volume.storey_count, storey_height: volume.storey_height }),
      shadow: shadowJudge.result,
      shadowText: shadowJudge.text,
      brokenFloors,
    })
  const clickNext = () => {
    const issues = p2Issues()
    if (nextGateOf(issues) === 'go') onNext?.()
    else setNextIssues(issues)
  }
  const goNextAnyway = (issues: readonly CheckIssue[]) => {
    recordWorkLog({
      at: new Date().toISOString(),
      screen: 'P2',
      action: '次へ（要確認として残した）',
      target: issues.map((i) => `${i.area}: ${i.text}`).join(' / '),
      who: 'human',
    })
    setNextIssues(null)
    onNext?.()
  }

  return (
    <div className="p03">
      <header className="p03-toolbar">
        <strong>ボリューム作図</strong>
        {headerSlots && createPortal(<>        <span className="p03-mode">
          <HeaderIconButton label="平面" pressed={view === 'plan'} onClick={() => setView('plan')} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="1"/><path d="m6 11 6-5 6 5M8 10v7h8v-7M11 17v-4h2v4"/></svg>} />
          <HeaderIconButton label="3D" pressed={view === '3d'} onClick={() => setView('3d')} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true"><path d="m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10"/></svg>} />

        </span>
        <span className="p03-layers" aria-label="表示の切り替え">
          <HeaderIconButton label="地図" icon={<IconMap />} pressed={mapShownOf(volumeMap, mapTiles.length)} title={mapTiles.length === 0 ? "敷地を選ぶと地図を表示できます" : "地図"} onClick={() => { if (mapTiles.length === 0) onSelectSite?.(); else setVolumeMap(!volumeMap) }} />
          <HeaderIconButton label="周辺建物" icon={<IconBuildings />} pressed={volumeNeighbors} onClick={() => setVolumeNeighbors(!volumeNeighbors)} />
          <HeaderIconButton label="影" icon={<IconShadow />} pressed={volumeShadow} onClick={() => setVolumeShadow(!volumeShadow)} />
          <HeaderIconButton label="斜線の面" icon={<IconSlope />} pressed={volumeSlope} onClick={() => setVolumeSlope(!volumeSlope)} />
        </span>
</>, headerSlots.display)}
        {headerSlots && createPortal(<HeaderIconButton label="全部消す" title="描いた線をすべて削除" disabled={segments.length === 0} onClick={() => { if (window.confirm("描いた線をすべて削除しますか？")) clear() }} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" d="M12 2v4m0 12v4M2 12h4m12 0h4M5 5l3 3m8 8 3 3M5 19l3-3M16 8l3-3"/></svg>} />, headerSlots.clear)}
        {!toolbarVisible && <button type="button" title="作図ツールを表示" aria-label="作図ツールを表示" onClick={()=>setToolbarVisible(true)}>✎</button>}
        {confirmed === null ? <span className="p03-note" role="status">地図を表示するには敷地を確定してください。<button type="button" onClick={onSelectSite}>敷地を選ぶ</button></span> : null}
        {confirmed !== null && isConfirmedStaleOf(confirmed, currentUid, currentSite) ? <span className="p03-note">確定し直しが要る（敷地で地点か筆を変えた）。</span> : null}
      </header>
      <div className="p03-body">
        <ObjectMenu
          sources={objectSources}
          countSources={countSources}
          selectedKind={selectedKind}
          onSelect={setSelectedKind}
          caption="種類ごとの件数（外形と仮の筆界）"
          folded={menuFold.folded}
          onToggleFold={menuFold.toggle}
        />
        <div data-tutorial="tutorial-draw" className="volume-preview-workspace">
        {toolbarVisible && <DockedPenToolbar onClose={()=>setToolbarVisible(false)} onPan={()=>{setSelectOnly(false);setBoxPlot(false);setPanOnly(true)}} onBox={()=>{setSelectOnly(false);setPanOnly(false);setPlanningPreview(null);setBoxPlot(true)}} onSelect={() => { setSelectOnly(true); setBoxPlot(false); setPanOnly(false) }} isSelecting={selectOnly} isBox={boxPlot}
          isDrawing={view === 'plan' && !panOnly} onDraw={startDrawing} placement={placement} />}
        {view === '3d' ? (
          boxPlot || shouldShowScene3DOf({ hasVolume: volume !== null, hasLot: parcel !== null, neighborCount: neighborsOn ? neighbors.length : 0 }) ? (
            <div style={{ flex: 1, minWidth: 0, minHeight: 420, position: 'relative' }}>
              <SceneErrorBoundary>
              <Volume3D
                boxPlot={boxPlot ? { onCancel: () => setBoxPlot(false), onComplete: (a,b) => {
                  const next = boxOutline(Math.abs(b.x-a.x), Math.abs(b.y-a.y), {x:(a.x+b.x)/2,y:(a.y+b.y)/2})
                  transform(es => tutorialDrawing ? [...es.filter(en=>!en.segments.some(s=>closure.footprint?.some(p=>p.x===s.x1&&p.y===s.y1))),...next] : [...es,...next]); if(tutorialDrawing)tutorialDone('tutorial-draw'); setBoxPlot(false)
                }} : undefined}
                canPlace={fp => placementAllowed(lot, fp, edge)}
                onResize={selectOnly && featureOn.knobs ? (edge, dx, dy) => {
                  if (!closure.closed || !closure.footprint) return
                  const from = closure.footprint
                  const to = from.map((p, i) => i === edge || i === (edge + 1) % from.length ? { x: p.x + dx, y: p.y + dy } : p)
                  if (placementAllowed(lot, to, edge)) transform(es => moveOutlineVertices(es, from, to))
                } : undefined}
                onMove={selectOnly ? (dx, dy) => {
                  if (!closure.closed || !closure.footprint || (!dx && !dy)) return
                  const from = closure.footprint
                  const to = from.map(p => ({ x: p.x + dx, y: p.y + dy }))
                  if (placementAllowed(lot, to, edge)) transform(es => moveOutlineVertices(es, from, to))
                } : undefined}
                gridAngleDeg={0} northAngleDeg={planningAngle}
                footprint={volume ? volume.footprint : null}
                lot={parcel}
                shadow={shadowOn ? sunShadow : null}
                neighbors={neighborsOn ? neighbors : []}
                showMap={mapShownOf(volumeMap, mapTiles.length)}
                mapTiles={mapTiles}
                slopeSheets={slopeSheets}
                overrunFloors={overrunFloors}
                showSlope={volumeSlope}
                floors={stackedFloors}
                setbackLines={showDimensions ? setbackLinesOfVolume : null}
                storeyCount={storeyCount}
                storeyHeightMm={storeyHeightMm}
                onHome={() => setHomeToken((n) => n + 1)}
                homeToken={homeToken}
                rotationStep={rotateStep}
                onRotateStart={featureOn.knobs && featureOn.rotateOperation ? onKnobRotateStart : undefined}
                onRotate={featureOn.knobs && featureOn.rotateOperation ? onKnobRotate : undefined}
                onStoreyCount={featureOn.knobs ? setStoreyCount : undefined}
              />
              </SceneErrorBoundary>
              {showMiniMap && boundsOf([lot, ...overviewShadows, ...(volume ? [volume.footprint] : [])]) ? (
                <MiniMap yUp bounds={boundsOf([lot, ...overviewShadows, ...(volume ? [volume.footprint] : [])])!} site={lot} shadows={overviewShadows} polygons={volume ? [volume.footprint] : []} />
              ) : null}
            </div>
          ) : (
            <div style={{ flex: 1, minWidth: 0, minHeight: 420, display: 'grid', placeItems: 'center', background: '#f4f4f2' }}>
              <p className="muted">{volumeError ? `立体を作れないので 3D が出ない（${volumeError}）` : '外形が閉じると 3D が出る'}</p>
            </div>
          )
        ) : (
          <div className="p03-canvas-wrap">
            <DrawingCanvas onDimensionRequest={()=>setDimensionFocus(n=>n+1)} showRoadNumbers={showRoadNumbers} overviewShadows={overviewShadows} selectOnly={selectOnly && !boxPlot && planningPreview === null} panOnly={panOnly || boxPlot || planningPreview !== null} siteOverride={confirmed} />
            {boxPlot && <BoxPlot onCancel={() => setBoxPlot(false)} onComplete={(a, b) => {
              const next = boxOutline(Math.abs(b.x-a.x), Math.abs(b.y-a.y), {x:(a.x+b.x)/2,y:(a.y+b.y)/2})
              transform(es => tutorialDrawing ? [...es.filter(en=>!en.segments.some(s=>closure.footprint?.some(p=>p.x===s.x1&&p.y===s.y1))),...next] : [...es,...next]); if(tutorialDrawing)tutorialDone('tutorial-draw')
              setBoxPlot(false)
            }} />}
            <div style={{position: 'absolute', top: 8, right: 8, pointerEvents: 'none'}}><OrientationCompass angle={planningAngle} /></div>
            <CircleMenu />
          </div>
        )}
        </div>
        <div
          className="p03-side-resizer"
          role="separator"
          aria-label="右サイドメニューの幅"
          aria-orientation="vertical"
          aria-valuemin={220}
          aria-valuemax={600}
          aria-valuenow={sideWidth}
          tabIndex={0}
          title="ドラッグで幅を変更（左右キーでも調整）"
          onPointerDown={(e) => {
            if (e.button !== 0) return
            e.preventDefault()
            sideDrag.current = { x: e.clientX, width: sideWidth }
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            const drag = sideDrag.current
            if (!drag) return
            const available = e.currentTarget.parentElement!.clientWidth
            const max = Math.max(220, Math.min(600, available - 280))
            setSideWidth(Math.min(max, Math.max(220, drag.width + drag.x - e.clientX)))
          }}
          onPointerUp={(e) => {
            sideDrag.current = null
            if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
          }}
          onPointerCancel={() => { sideDrag.current = null }}
          onLostPointerCapture={() => { sideDrag.current = null }}
          onKeyDown={(e) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(e.key)) return
            e.preventDefault()
            const max = Math.max(220, Math.min(600, e.currentTarget.parentElement!.clientWidth - 280))
            setSideWidth(e.key === 'Home' ? Math.min(260, max) : Math.min(max, Math.max(220, sideWidth + (e.key === 'ArrowLeft' ? 16 : -16))))
          }}
        />
        <aside className="p03-side" style={{ width: sideWidth }}>
          <section data-tutorial="tutorial-p2-next">
            <button type="button" onClick={clickNext}>
              次へ（平面）
            </button>
            {nextIssues !== null ? (
              <NextCheckPanel
                issues={nextIssues}
                goLabel="このまま進む（要確認として残す）"
                onStay={() => setNextIssues(null)}
                onGoAnyway={() => goNextAnyway(nextIssues)}
              />
            ) : null}
          </section>

          <VolumePlanPanel />
          <section data-tutorial="volume-dimensions" aria-label="階数・階高">
            <h2>階数・階高・寸法</h2>
            <VolumeDimensions footprint={closure.closed ? closure.footprint : null} focusRequest={dimensionFocus} onApply={next=>{
              if(!closure.footprint)return
              if(!placementAllowed(lot,next,edge))throw Error('敷地外または境界からの離隔不足になるため反映できません')
              transform(es=>moveOutlineVertices(es,closure.footprint!,next))
            }}/>

            <label>
              階数
              <input
                type="number"
                min={1}
                step={1}
                value={storeyCount}
                onChange={(e) => setStoreyCount(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              />
            </label>
            <label>
              階高 (mm)
              <input
                type="number"
                min={1}
                step={100}
                value={storeyHeightMm}
                onChange={(e) => setStoreyHeightMm(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              />
            </label>
          </section>
          <section aria-label="法規の表示">
            <h2 title={inheritedZoneName ? `敷地から引継ぎ：${inheritedZoneName}` : undefined}>法規の表示</h2>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span>道路・境界番号（平面）</span>
              <button type="button" aria-label="道路・境界番号の表示" aria-pressed={showRoadNumbers} onClick={() => setShowRoadNumbers(value => !value)}>{showRoadNumbers ? 'オン' : 'オフ'}</button>
            </label>
            {([['north', '北側斜線'], ['road', '道路斜線'], ['adjacent', '隣地斜線']] as const).map(([kind, label]) => (
              <label key={kind} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span>{label}</span>
                <button type="button" disabled={kind === 'north' && northExcluded} title={kind === 'north' && northExcluded ? `${inheritedZoneName ?? effectiveZone}：法56条の北側斜線は対象外（高度地区の制限とは別）` : undefined} aria-pressed={!(kind === 'north' && northExcluded) && volumeSlope && slopeVisibility[kind]} onClick={() => {
                  const enabled = !(volumeSlope && slopeVisibility[kind])
                  setSlopeVisibility({ ...(volumeSlope ? slopeVisibility : { north: false, road: false, adjacent: false }), [kind]: enabled })
                  setVolumeSlope(true)
                  if (enabled) setView('3d')
                }}>{kind === 'north' && northExcluded ? '対象外' : volumeSlope && slopeVisibility[kind] ? 'オン' : 'オフ'}</button>
              </label>
            ))}
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span>日影（指定時刻の影）</span>
              <button type="button" aria-pressed={shadowOn} onClick={() => {
                if (!shadowOn) { useUi.getState().setShowShadow(true); setView('3d') }
                setVolumeShadow(!shadowOn)
              }}>{shadowOn ? 'オン' : 'オフ'}</button>
            </label>
            <p className="p03-note">斜線は適用対象の面を表示します。表示切替は計算条件を変更しません。</p>
          </section>

          <section style={tileStyle('p2-outline')}>
            <details><summary style={{ cursor: 'pointer' }}>外形の詳細</summary>
            <p>基準線: {baselineLabelOf(baselineOpts)}</p>
            <dl>
              <dt>線分</dt>
              <dd>{segments.length} 本</dd>
              <dt>閉合</dt>
              <dd className={closure.closed ? 'ok' : 'ng'}>{closureLabel}</dd>
            </dl>
            <label>
              基準線
              <select value={baselineSide} onChange={(e) => setBaselineSide(e.target.value as BaselineSide)}>
                <option value="中心線">外壁の中心線（既定）</option>
                <option value="内側">内側の面（壁厚 200 mm の半分だけ内へ）</option>
              </select>
            </label>
            <label>
              中心線からずらす (mm・外へ正、内へ負)
              <input type="number" step={10} value={baselineOffsetText} onChange={(e) => setBaselineOffsetText(e.target.value)} />
            </label>
            </details>
            {baselineError ? <p className="ng">{baselineError}</p> : null}
          </section>
          <section style={tileStyle('p2-volume')}>
            <TileClose title="ボリューム" onHide={() => hideTile('p2-volume')} />
            <h2>ボリューム</h2>
            {volume && cut ? (
              <dl>
                <dt>高さ</dt>
                <dd>{volume.total_height.toLocaleString('ja-JP')} mm</dd>
                <dt>建築面積</dt>
                <dd>{m2(cut.building_area_mm2)} m²</dd>
                <dt>延床面積</dt>
                <dd>{m2(cut.gross_floor_area_mm2)} m²</dd>
                <dt>斜線（北・隣地・道路）</dt>
                <dd>
                  {legal.boundaries.length === 0
                    ? slopeRowReasonOf(legal)
                    : judgeSlope(volume.footprint, legal.boundaries, { storey_count: volume.storey_count, storey_height: volume.storey_height })}
                  {legal.pending.includes(NORTH_NEEDS_TRUE_NORTH) ? <div className="muted">{NORTH_NEEDS_TRUE_NORTH}</div> : null}
                </dd>
                <dt>日影 ※</dt>
                <dd>
                  {automaticShadow ? `最大 ${automaticShadow.outside.reduce((max,c)=>Math.max(max,c.hours),0).toFixed(1)} h（冬至）` : '未計算'}
                  {shadowJudge.result ? `・${shadowJudge.result}` : '・規制判定は※参照'}
                </dd>
                <dt>容積率</dt>
                <dd>
                  {(cut.floor_area_ratio * 100).toFixed(0)} %（{farJudgement}）
                </dd>
              </dl>
            ) : (
              <p className="muted">外形が閉じると出る</p>
            )}
            <label>
              日射の時期
              <select value={solarDate} onChange={e => setSolarDate(e.target.value)}>
                <option value="2026-03-20">春分</option><option value="2026-06-21">夏至</option><option value="2026-09-23">秋分</option><option value="2026-12-22">冬至</option>
              </select>
            </label>
            <label>日射の時刻
              <select value={solarTime} onChange={e => setSolarTime(e.target.value)}>
                {Array.from({length:48},(_,i)=>`${String(Math.floor(i/2)).padStart(2,'0')}:${i%2?'30':'00'}`).map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            {legal.pending.length > 0 && <p className="muted">判定不能（切り取らない）: {legal.pending.join('、')}</p>}
            <details>
              <summary style={{ cursor: 'pointer' }}>※ 日影の補足・規制値</summary>
              <p className="muted">条例の限界値には未取得・未確認の項目があります。未入力でも次へ進めます。未判定を適合とは扱いません。</p>
              <p className="muted">規制判定：{shadowJudge.text}</p>
              <p className="muted">日影時間は冬至8〜16時、10分刻み・2m格子、敷地外周20mまでの地上の計算です。</p>
              <p className="muted">江東区の一覧: {koutoAreaOf(parcelProps ? chomeNameOf(parcelProps) : null).reason}</p>
              {ORDINANCE_KEYS.map(k => <div key={k}><OrdinanceStatusLine itemKey={k} /></div>)}
              <OrdinanceForm compactSite />
              <p className="muted">{slopeLotNoteOf(parcel, chiban)}日影の規制判定には確認済みの条例値を使用します。</p>
            </details>
          </section>
          <section style={{ ...tileStyle('p2-numeric'), ...(devShown ? {} : { display: 'none' }) }}>
            <TileClose title="数値で線を入れる" onHide={() => hideTile('p2-numeric')} />
            <h3 style={{ fontSize: 13, margin: '10px 0 2px' }}>数値で線を入れる（仮置き）</h3>
            <NumericLineForm />
          </section>
          <section style={{ ...tileStyle('p2-rotate'), ...(featureOn.rotateDisplay && devShown ? {} : { display: 'none' }) }}>
            <TileClose title="回転" onHide={() => hideTile('p2-rotate')} />
            <h3 style={{ fontSize: 13, margin: '10px 0 2px' }}>回転（重心のまわり）</h3>
            <label>
              回転角 (°、反時計回り)
              <input type="number" value={rotateText} onChange={(e) => setRotateText(e.target.value)} />
            </label>
            <label>
              刻み
              <select
                value={String(rotateStep)}
                onChange={(e) => setRotateStep(ROTATION_STEPS.find((s) => String(s) === e.target.value) ?? 'free')}
              >
                {ROTATION_STEPS.map((s) => (
                  <option key={String(s)} value={String(s)}>
                    {s === 'free' ? '自由' : `${s}°`}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted">回す量: {rotateDeg}°（刻みで丸めた値）</p>
            <button
              type="button"
              disabled={!closure.closed || rotateDeg === 0 || !featureOn.rotateOperation}
              onClick={() => {
                transform((es) => rotateOutline(es, rotateDeg))
              }}
            >
              回す
            </button>
          </section>
          <section style={tileStyle('claude-chat')}>
            <TileClose title="Claude（チャット）" onHide={() => hideTile('claude-chat')} />
            <h2>Claude（チャット）</h2>
            <ChatTile screen="P2" />
          </section>
          <section style={{ ...tileStyle('feature-adjust'), ...(devShown ? {} : { display: 'none' }) }}>
            <TileClose title="機能の調整" onHide={() => hideTile('feature-adjust')} />
            <h2>機能の調整</h2>
            <FeatureAdjustTile screen="P2" />
          </section>
          {activeMode === 'drawing' && view === 'plan' && !panOnly && !selectOnly && !boxPlot && <section style={tileStyle('drawing-review')}>
            <TileClose title="オブジェクト判定（Drawing）" onHide={() => hideTile('drawing-review')} />
            <DrawingReviewTile />
          </section>}
        </aside>
      </div>

    </div>
  )
}

