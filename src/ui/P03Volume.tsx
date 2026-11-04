// P03 ボリューム作図（描く）。D-04 v7 の一枚目: 直線モード、閉合、階数・階高、押し出し。
// 斜線・日影・段状の切り取り・自動案・3D は次の一枚。
import { useEffect, useMemo, useRef, useState } from 'react'
import { findClosedOutline } from '../canvas/closure'
import { extrudeOrReason, type ExtrudeResult } from '../volume/extrudeResult'
import { NumericLineForm } from './NumericLineForm'
import { useFeatures } from '../store/features'
import { DEFAULT_ROAD_WIDTH_SOURCE, ROAD_WIDTH_SOURCES, roadWidthNote, type RoadWidthSource } from '../volume/roadWidthSource'
import { volumeAfterSlope } from '../volume/cutVolume'
import { legalBoundaries } from '../volume/legalSlope'
import { setbackFromRectParcel } from '../volume/placement'
import { placeBySetback } from '../volume/placeBySetback'
import { alignToDirection } from '../volume/alignToRoad'
import { baselineLabelOf, baselineOutline, DEFAULT_WALL_THICKNESS_MM, type BaselineSide } from '../volume/baselineOutline'
import { rotateOutline } from '../canvas/outlineEdit'
import { ROTATION_STEPS, roundFootprintMm, snapAngle, type RotationStep } from '../volume/rotation'
import { judgeSlope } from '../volume/slopeJudge'
import { judgeShadow } from '../law/shadowRegulation'
import { shadowDrawing, shadowDrawingSummary } from '../law/shadowDrawing'
import { cutFloors } from '../volume/slope'
import { shadowOf } from '../volume/shadow'
import { useUi } from '../store/ui'
import { MiniMap } from './MiniMap'
import { boundsOf } from './mapBounds'
import { SHADOW_KEYS, shadowRuleFromOrdinance } from '../law/shadowOrdinance'
import { ordinanceStatus } from '../law/ordinance'
import { confirmMeasurement } from '../law/measurementConfirm'
import { ICHI_NOTE } from '../law/fireIchi'
import { useOrdinance } from '../store/ordinance'
import { solarPosition } from '../law/solarPosition'
import { siteRuleFromDistricts } from '../law/siteRule'
import { suggestMeasurement } from '../law/shadowSuggest'
import type { HeightDistrict } from '../law/shadowMeasure'

/** 高度地区の区分（人が入れる。測定面の候補に使う） */
const HEIGHT_DISTRICTS: readonly HeightDistrict[] = ['第一種', '第二種', '第三種', '指定なし']

/** 測定面の候補の一行（都条例の別表第一。提案で、判定には使わない） */
function measurementHintOf(site: { zone: string; farPercent: number | null } | null, height: HeightDistrict | ''): string {
  if (!site) return '用途地域が決まっていない（P1 で取得する）'
  const r = suggestMeasurement({ zone: site.zone, farPercent: site.farPercent, heightDistrict: height === '' ? null : height })
  return r.ok ? `${r.measurement.measurementM} m（別表第一 ${r.measurement.band}）` : `決められない（${r.reason}）`
}
import { useSite } from '../store/site'
import type { Zone } from '../law/slopeRules'
import { judgeFar } from '../volume/farCheck'
import { useDrawing } from '../store/drawing'
import { CircleMenu } from './CircleMenu'
import { DrawingCanvas } from './DrawingCanvas'
import { PenToolbar } from './PenToolbar'
import { Volume3D } from './Volume3D'
import { neighborVolumes } from '../volume/neighborLocal'
import type { ObjectKind } from '../plan/objectMenu'
import { objectSourcesOfFootprint } from '../plan/objectSourcesOfPlan'
import { sourcesOfTable } from '../plan/objectCountsOfTable'
import { emptyObjectTableInput, objectTableOf } from '../plan/objectTable'
import { ObjectMenu } from './ObjectMenu'
import { TileClose } from './PanelTile'
import { usePanelTiles } from '../store/panelTiles'
import { OrdinanceStatusLine, ORDINANCE_KEYS } from './OrdinanceForm'

const m2 = (mm2: number) => (mm2 / 1_000_000).toLocaleString('ja-JP', { maximumFractionDigits: 2 })
import { DUMMY_PARCEL, DUMMY_PARCEL_MM2 } from '../plan/dummyParcel'
const ZONES: Zone[] = ['低層住専', '田園住居', '中高層住専', '住居系', '商業系', '準工・工業系', '高層住居誘導', '指定なし']
// 周辺建物は P1 の基準点を、ダミー筆界の中心（20 m × 30 m の中心）に合わせて置く（筆界が入るまでの仮）
const PARCEL_CENTER_MM = { x: 10_000, y: 15_000 }

export function P03Volume() {
  const entries = useDrawing((s) => s.entries)
  const segments = useMemo(() => entries.flatMap((e) => e.segments), [entries])
  const closure = useMemo(() => findClosedOutline(segments), [segments])
  // 左メニュー（G55）の入力: 外形（閉じた輪郭）と仮の筆界（ダミー）から。P1 の筆界が入るまでの仮
  const objectSources = useMemo(() => objectSourcesOfFootprint(closure.footprint, DUMMY_PARCEL), [closure])
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
  const [view, setView] = useState<'plan' | '3d'>('3d')
  // 左メニュー（G55）で選んだ種類（1 つだけ。もう一度押すと外れる）。2D 平面のときだけ出す（3D のときに出すかは未決）
  const [selectedKind, setSelectedKind] = useState<ObjectKind | null>(null)
  const [homeToken, setHomeToken] = useState(0)
  const siteBuildings = useSite((s) => s.buildings)
  const showShadow = useUi((s) => s.showShadow)
  const showNeighbors = useUi((s) => s.showNeighbors)
  const showMiniMap = useUi((s) => s.showMiniMap)
  const sitePoint = useSite((s) => s.sitePoint)
  const neighbors = useMemo(
    () => (siteBuildings && sitePoint ? neighborVolumes(siteBuildings, sitePoint, PARCEL_CENTER_MM) : []),
    [siteBuildings, sitePoint],
  )

  const [farLimit, setFarLimit] = useState('')
  const [heightDistrict, setHeightDistrict] = useState<HeightDistrict | ''>('')
  // 日射（G53）: 冬至（2026-12-22）の時刻（日本時間）。場所は江東区の点（35.67N, 139.86E）
  const [solarTime, setSolarTime] = useState('12:00')
  const sun = useMemo(() => {
    if (!/^\d{2}:\d{2}$/.test(solarTime)) return null
    return solarPosition({ lat: 35.67, lon: 139.86, date: new Date(`2026-12-22T${solarTime}:00+09:00`) })
  }, [solarTime])
  const [zone, setZone] = useState<Zone>('住居系')
  const [roadEdge, setRoadEdge] = useState(0)
  const [roadWidth, setRoadWidth] = useState('6000')
  // 幅員の出どころ（G16。仮置き）: 値は入力のまま、出どころの名前だけを持つ
  const [roadSource, setRoadSource] = useState<RoadWidthSource>(DEFAULT_ROAD_WIDTH_SOURCE)
  // 敷地との離れ（西・南）。入れると建物をその位置へ移す。北と東は建物の大きさで決まる（G67）
  const [westText, setWestText] = useState('')
  const [southText, setSouthText] = useState('')
  // 基準線（ハブ A-03 G59・統括の依頼 t52）: 描いた外形（外壁の中心線）を、内側へ寄せるか、中心線から量（外へ正）だけずらす。既定は中心線・ずらし 0
  const [baselineSide, setBaselineSide] = useState<BaselineSide>('中心線')
  const [baselineOffsetText, setBaselineOffsetText] = useState('0')

  // 離れ（西・南）の入力があれば、建物をその位置へ移した外形を使う。空欄なら描いた位置のまま
  // 向き（G64）: 建物の最初の辺を、前面道路の辺に平行にそろえる。道路の向きは筆界のダミーの辺から
  const [aligned, setAligned] = useState(false)
  // 回転（G71）: 右パネルの角度（°）と刻み。「回す」で外形を重心のまわりに回し、store に確定する
  const [rotateText, setRotateText] = useState('0')
  const [rotateStep, setRotateStep] = useState<RotationStep>('free')
  // 機能のオンオフ（G70）: 回転の表示と操作、つまみ、斜線と日影の再計算
  const featureOn = useFeatures((s) => s.on)
  // 右パネルの節を閉じる（ハブ A-03 G73）。閉じた節は display: none で残し、入力の値は保つ
  const hiddenTiles = usePanelTiles((s) => s.hidden)
  const { hideTile } = usePanelTiles.getState()
  const tileStyle = (id: string) => ({ position: 'relative' as const, ...(hiddenTiles[id] ? { display: 'none' as const } : {}) })
  const rotateDeg = snapAngle(Number(rotateText), rotateStep)
  // 3D の角の回転つまみ（G71）: つまんだ時点の外形（entries）を覚え、離したときに、その外形へ丸めた角度を 1 回だけ与えて確定する（Undo は 1 回で戻る）
  const knobSnapshotRef = useRef<typeof entries | null>(null)
  const onKnobRotateStart = () => {
    knobSnapshotRef.current = useDrawing.getState().entries
  }
  const onKnobRotate = (deg: number) => {
    const snapshot = knobSnapshotRef.current ?? useDrawing.getState().entries
    knobSnapshotRef.current = null
    // 向きの合わせ（aligned）のままだと最初の辺が道路へ戻されて、回転が効かない（右の「回す」と同じ）
    setAligned(false)
    transform(() => rotateOutline(snapshot, deg))
  }
  const roadDeg = (() => {
    const a = DUMMY_PARCEL[roadEdge]!
    const b = DUMMY_PARCEL[(roadEdge + 1) % DUMMY_PARCEL.length]!
    return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
  })()

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
  const placedFootprint = useMemo(() => {
    if (baseline === null || !baseline.ok) return null
    // 向きの出力は整数 mm に丸める（extrudeVolume は整数の外形しか受け付けない。丸めないと 3D も日影も消える）
    const base = aligned ? roundFootprintMm(alignToDirection(baseline.footprint, roadDeg)) : baseline.footprint
    const w = Number(westText)
    const s = Number(southText)
    if (westText === '' || southText === '' || !Number.isFinite(w) || !Number.isFinite(s)) return base
    return roundFootprintMm(placeBySetback(base, DUMMY_PARCEL, { west: w, south: s }))
  }, [baseline, westText, southText, aligned, roadDeg])

  // 立体が作れないときは理由を持つ（黙って消さない。3D の場所と判定の文言に出す）
  const extruded = useMemo<ExtrudeResult | null>(() => {
    if (!closure.closed || placedFootprint === null) return null
    return extrudeOrReason({ footprint: placedFootprint, storey_count: storeyCount, storey_height: storeyHeightMm })
  }, [closure, placedFootprint, storeyCount, storeyHeightMm])
  const volume = extruded?.ok ? extruded.volume : null
  // 基準線で外形が消えるときは、その理由を出す（黙って 3D を消さない）
  const baselineError = baseline !== null && !baseline.ok ? baseline.reason : null
  const volumeError = baselineError ?? (extruded && !extruded.ok ? extruded.reason : null)

  // 法定の斜線を、筆界（ダミー 20 m × 30 m）の辺に当てて切り取る。前面道路の辺・幅員・用途地域・容積率の限度は利用者が入れる
  // P1 で用途地域が一つに決まっていれば、その区分と容積率の限度を使う（PLATEAU）。無ければ利用者の入力
  const siteMatches = useSite((s) => s.matches)
  const siteRule = useMemo(() => (siteMatches ? siteRuleFromDistricts(siteMatches) : null), [siteMatches])
  const effectiveZone = siteRule?.zone ?? zone
  const inputFar = farLimit === '' ? null : Number(farLimit)
  const effectiveFar = siteRule?.farPercent ?? inputFar

  const legal = useMemo(() => {
    if (effectiveFar === null || !Number.isFinite(effectiveFar) || effectiveFar <= 0) {
      return { boundaries: [], pending: ['容積率の限度（上限）が未入力'] }
    }
    return legalBoundaries({
      footprint: DUMMY_PARCEL,
      roadEdgeIndex: roadEdge,
      roadWidthMm: Number(roadWidth) || 0,
      zone: effectiveZone,
      farPercent: effectiveFar,
    })
  }, [effectiveFar, effectiveZone, roadEdge, roadWidth])

  const cut = useMemo(() => {
    if (!volume) return null
    return volumeAfterSlope(
      { footprint: volume.footprint, storey_count: volume.storey_count, storey_height: volume.storey_height },
      legal.boundaries,
      DUMMY_PARCEL_MM2,
    )
  }, [volume, legal])

  // 敷地との離れ（敷地が矩形のときだけ。G67）
  const setback = useMemo(() => (volume ? setbackFromRectParcel(DUMMY_PARCEL, volume.footprint) : null), [volume])
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
  const stackedFloors = useMemo(() => {
    if (!volume) return []
    const floors =
      legal.boundaries.length > 0
        ? cutFloors(volume.footprint, legal.boundaries, volume)
        : Array.from({ length: volume.storey_count }, () => volume.footprint)
    return floors.map((f, i) => ({ footprint: f, heightMm: (i + 1) * volume.storey_height })).filter((b) => b.footprint.length >= 3)
  }, [volume, legal])
  // 地面に落ちる日影（時刻の太陽の位置から、切り取った階ごとの影の形）。太陽が地平線の上のときだけ
  const sunShadow = useMemo(
    () =>
      sun && sun.altitudeDeg > 0 && stackedFloors.length > 0
        ? stackedFloors.map((b) => shadowOf(b.footprint, b.heightMm, sun.altitudeDeg, sun.azimuthFromSouthDeg))
        : null,
    [stackedFloors, sun],
  )
  const ordinanceEntries = useOrdinance((s) => s.entries)
  const setOrdinanceEntry = useOrdinance((s) => s.setEntry)
  const confirmOrdinance = useOrdinance((s) => s.confirm)
  const heightStatus = ordinanceStatus(ordinanceEntries, SHADOW_KEYS.height)
  // 測定面の候補（G87）。表から出す提案。確定するまで判定には使わない
  const candidate = siteRule
    ? suggestMeasurement({ zone: siteRule.zone, farPercent: siteRule.farPercent, heightDistrict: heightDistrict === '' ? null : heightDistrict })
    : { ok: false as const, reason: '用途地域が決まっていない' }
  // 日影規制（冬至 8:00〜16:00）。切り取った階ごとの形で判定する。規制値が無い用途地域は対象外と出す。規制値は確認済みの条例の値だけ（G15）
  const shadowJudge = useMemo(() => {
    // 再計算をオフにしているときは、判定を計算せずに止めていると出す（G70）
    if (!featureOn.shadowRecalc) return { text: '再計算を止めている（機能のオンオフ）', result: null as '適合' | '不適合' | null }
    if (!volume) {
      return { text: volumeError ? `立体を作れないので判定できない（${volumeError}）` : '外形が閉じると判定する', result: null as '適合' | '不適合' | null }
    }
    // 規制値は、人が確認した条例の値だけで置く（G15）。未確認・未入力なら判定しない
    const ordinance = shadowRuleFromOrdinance(zone, ordinanceEntries)
    if (!ordinance.ok) return { text: ordinance.reason, result: null as '適合' | '不適合' | null }
    const judgment = judgeShadow({
      lot: DUMMY_PARCEL,
      buildings: stackedFloors,
      rule: ordinance.rule,
      lat: 35.67,
      lon: 139.86,
      date: new Date(Date.UTC(2026, 11, 22)),
    })
    // 日影図（RC 造。切り取った階ごとの影を格子で数える）の一行を判定文に添える（t28）
    const drawingText = shadowDrawingSummary(
      shadowDrawing({
        structure: 'RC',
        lot: DUMMY_PARCEL,
        buildings: stackedFloors,
        rule: ordinance.rule,
        lat: 35.67,
        lon: 139.86,
        date: new Date(Date.UTC(2026, 11, 22)),
      }),
    )
    if (judgment.result === '適合') return { text: `適合（確認済みの条例の値で判定）／${drawingText}`, result: '適合' as const }
    const w = judgment.worst!
    return { text: `不適合（最大 ${w.hours} h、境界から ${w.distanceM} m、上限 ${w.limit} h）／${drawingText}`, result: '不適合' as const }
  }, [volume, volumeError, zone, stackedFloors, featureOn.shadowRecalc, ordinanceEntries])
  useEffect(() => {
    useSite.getState().setShadow(shadowJudge.result)
  }, [shadowJudge])
  // 外形と階を P4 に渡す（数量の自動拾い）
  useEffect(() => {
    useSite.getState().setVolume(volume ? { footprint: volume.footprint, storey_count: volume.storey_count, storey_height: volume.storey_height } : null)
  }, [volume])

  const farJudgement = cut ? judgeFar(cut.floor_area_ratio, farLimit === '' ? undefined : Number(farLimit)) : '—'

  const closureLabel = closure.closed
    ? '閉じている'
    : closure.reason === 'empty'
      ? 'まだ線が無い'
      : closure.reason === 'open'
        ? '閉じていない（端点がつながっていない）'
        : closure.reason === 'branch'
          ? '閉じていない（枝が出ている）'
          : '閉じていない（複数の輪）'

  return (
    <div className="p03">
      <header className="p03-toolbar">
        <strong>P03 ボリューム作図</strong>
        {placement === 'top' && <PenToolbar placement="top" />}
        <span className="p03-mode">
          表示:
          <button type="button" className={view === 'plan' ? 'is-active' : undefined} aria-pressed={view === 'plan'} onClick={() => setView('plan')}>
            平面
          </button>
          <button type="button" className={view === '3d' ? 'is-active' : undefined} aria-pressed={view === '3d'} onClick={() => setView('3d')}>
            3D
          </button>
          {view === '3d' && (
            <button type="button" onClick={() => setHomeToken((n) => n + 1)} title="既定の向きに戻す">
              ホーム
            </button>
          )}
        </span>
        <span className="p03-actions">
          <button type="button" onClick={clear} disabled={segments.length === 0}>
            全部消す
          </button>
        </span>
        <span className="p03-note">議論用・未確定。筆界はダミー（20 m × 30 m）。指・マウス・ペンのどれでも描ける。2本指でパン・ズーム。右クリックかダブルタップで道具のメニュー。</span>
        {siteBuildings && (
          <span className="p03-note">周辺建物の底面 {neighbors.length} 件（P1 の地点を敷地中心に仮配置。高さ不明は表示しない）</span>
        )}
      </header>
      <div className="p03-body">
        {view === 'plan' && (
          <ObjectMenu sources={objectSources} countSources={countSources} selectedKind={selectedKind} onSelect={setSelectedKind} caption="種類ごとの件数（外形と仮の筆界）" />
        )}
        {placement === 'left' && <PenToolbar placement="left" />}
        {placement === 'free' && <PenToolbar placement="free" />}
        {view === '3d' ? (
          volume ? (
            <div style={{ flex: 1, minWidth: 0, minHeight: 420, position: 'relative' }}>
              <Volume3D
                footprint={volume.footprint}
                shadow={showShadow ? sunShadow : null}
                neighbors={showNeighbors ? neighbors : []}
                storeyCount={storeyCount}
                storeyHeightMm={storeyHeightMm}
                homeToken={homeToken}
                rotationStep={rotateStep}
                onRotateStart={featureOn.knobs && featureOn.rotateOperation ? onKnobRotateStart : undefined}
                onRotate={featureOn.knobs && featureOn.rotateOperation ? onKnobRotate : undefined}
                onStoreyCount={featureOn.knobs ? setStoreyCount : undefined}
              />
              {showMiniMap && boundsOf([volume.footprint]) ? (
                <MiniMap bounds={boundsOf([volume.footprint])!} polygons={[volume.footprint]} />
              ) : null}
            </div>
          ) : (
            <div style={{ flex: 1, minWidth: 0, minHeight: 420, display: 'grid', placeItems: 'center', background: '#f4f4f2' }}>
              <p className="muted">{volumeError ? `立体を作れないので 3D が出ない（${volumeError}）` : '外形が閉じると 3D が出る'}</p>
            </div>
          )
        ) : (
          <div className="p03-canvas-wrap">
            <DrawingCanvas />
            <CircleMenu />
          </div>
        )}
        <aside className="p03-side">
          <section style={tileStyle('p2-outline')}>
            <TileClose title="外形" onHide={() => hideTile('p2-outline')} />
            <h2>外形（基準線: {baselineLabelOf(baselineOpts)}）</h2>
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
            {baselineError ? <p className="ng">{baselineError}</p> : null}
          </section>
          <section style={tileStyle('p2-storey')}>
            <TileClose title="階数・階高" onHide={() => hideTile('p2-storey')} />
            <h2>階数・階高</h2>
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
                <dt>太陽の高さ（冬至）</dt>
                <dd>{sun ? `${sun.altitudeDeg.toFixed(1)} °` : '時刻を入れる（HH:MM）'}</dd>
                <dt>太陽の方位</dt>
                <dd>{sun ? `南から ${sun.azimuthFromSouthDeg.toFixed(1)} °` : '—'}</dd>
                <dt>斜線（北・隣地・道路）</dt>
                <dd>
                  {legal.boundaries.length === 0
                    ? '判定する規則が無い'
                    : judgeSlope(volume.footprint, legal.boundaries, { storey_count: volume.storey_count, storey_height: volume.storey_height })}
                </dd>
                <dt>日影</dt>
                <dd>
                  {shadowJudge.text}
                  {ORDINANCE_KEYS.map((k) => (
                    <div key={k}>
                      <OrdinanceStatusLine itemKey={k} />
                    </div>
                  ))}
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
              容積率の上限 (%)
              <input type="number" min={1} step={10} value={farLimit} placeholder="未入力（判定不能）" onChange={(e) => setFarLimit(e.target.value)} />
            </label>
            <label>
              日射の時刻（冬至・HH:MM）
              <input value={solarTime} onChange={(e) => setSolarTime(e.target.value)} />
            </label>
            {siteRule ? (
              <p className="muted">
                PLATEAU（P1 で取得）から: 区分 {siteRule.zone}、容積率の限度 {siteRule.farPercent === null ? '未取得' : `${siteRule.farPercent} %`}
              </p>
            ) : (
              <p className="muted">PLATEAU の用途地域が一つに決まらない（P1 で取得していない、または複数）。下の入力を使う。</p>
            )}
            <label>
              高度地区の区分（人が入れる。測定面の候補に使う）
              <select value={heightDistrict} onChange={(e) => setHeightDistrict(e.target.value as HeightDistrict | '')}>
                <option value="">未入力</option>
                {HEIGHT_DISTRICTS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted">測定面の候補（都条例の別表第一。表から出す提案）: {measurementHintOf(siteRule, heightDistrict)}</p>
            <p className="muted">
              <button
                type="button"
                disabled={!candidate.ok}
                onClick={() => confirmMeasurement(candidate, { setEntry: setOrdinanceEntry, confirm: confirmOrdinance })}
              >
                候補を測定面に確定
              </button>{' '}
              {heightStatus.status === '確認済み'
                ? `測定面は確定済み（${heightStatus.value} m）。判定に使っている`
                : '測定面が未確定のため、日影は判定しない（候補を確定するか、人が値を入れて確認する）'}
            </p>
            <p className="muted">防火（令 136 条の 2）: {ICHI_NOTE}</p>
            <label>
              用途地域
              <select value={zone} onChange={(e) => setZone(e.target.value as Zone)}>
                {ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </label>
            <label>
              前面道路の辺（0〜3）
              <input type="number" min={0} max={3} value={roadEdge} onChange={(e) => setRoadEdge(Math.min(3, Math.max(0, Math.floor(Number(e.target.value) || 0))))} />
            </label>
            <label>
              前面道路の幅員 (mm)
              <input type="number" min={1} step={500} value={roadWidth} onChange={(e) => setRoadWidth(e.target.value)} />
            </label>
            <label>
              幅員の出どころ（G16。仮置き）
              <select value={roadSource} onChange={(e) => setRoadSource(e.target.value as RoadWidthSource)}>
                {ROAD_WIDTH_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted">採用: {roadWidthNote(roadSource, Number(roadWidth) || 0)}</p>
            <h3 style={{ fontSize: 13, margin: '10px 0 2px' }}>敷地との離れ（筆界のダミーから）</h3>
            <button type="button" onClick={() => setAligned((v) => !v)} disabled={!closure.closed}>
              {aligned ? '向きを戻す' : '道路に平行に合わせる'}
            </button>
            <label>
              西の離れ (mm)
              <input type="number" value={westText} placeholder="空欄は描いた位置" onChange={(e) => setWestText(e.target.value)} />
            </label>
            <label>
              南の離れ (mm)
              <input type="number" value={southText} placeholder="空欄は描いた位置" onChange={(e) => setSouthText(e.target.value)} />
            </label>
            {setback ? (
              <dl>
                <dt>北</dt>
                <dd>{setback.north.toLocaleString('ja-JP')} mm</dd>
                <dt>東</dt>
                <dd>{setback.east.toLocaleString('ja-JP')} mm</dd>
                <dt>南</dt>
                <dd>{setback.south.toLocaleString('ja-JP')} mm</dd>
                <dt>西</dt>
                <dd>{setback.west.toLocaleString('ja-JP')} mm</dd>
              </dl>
            ) : (
              <p className="muted">外形が閉じると出る（敷地が矩形のときだけ離れを定義する。G67）</p>
            )}
            {legal.pending.length > 0 && <p className="muted">判定不能（切り取らない）: {legal.pending.join('、')}</p>}
            <p className="muted">斜線は法定の値（建築基準法 第56条・別表第三）を筆界（ダミー 20 m × 30 m）に当てて切る。日影は建築基準法 別表第四の値で判定（住居系・中高層住専・低層住専のみ。条例の値は要確認）。北側は真北の配線が未実装。</p>
          </section>
          <section style={tileStyle('p2-numeric')}>
            <TileClose title="数値で線を入れる" onHide={() => hideTile('p2-numeric')} />
            <h3 style={{ fontSize: 13, margin: '10px 0 2px' }}>数値で線を入れる（D-04 数値入力。仮置き）</h3>
            <NumericLineForm />
          </section>
          <section style={{ ...tileStyle('p2-rotate'), ...(featureOn.rotateDisplay ? {} : { display: 'none' }) }}>
            <TileClose title="回転" onHide={() => hideTile('p2-rotate')} />
            <h3 style={{ fontSize: 13, margin: '10px 0 2px' }}>回転（重心のまわり、G71）</h3>
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
                // 向きの合わせ（aligned）のままだと最初の辺が道路へ戻されて、回転が効かない
                setAligned(false)
                transform((es) => rotateOutline(es, rotateDeg))
              }}
            >
              回す
            </button>
          </section>
          <section>
            <button type="button" disabled={!volume} title="P04 柱割り作図はまだ無い">
              確定して P04 へ
            </button>
          </section>
        </aside>
      </div>
    </div>
  )
}
