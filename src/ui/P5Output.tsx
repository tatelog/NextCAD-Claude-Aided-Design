// P5 出力（D-04 P5、D-02 C9・C10・C11、t91・G46）。IFC と確認申請の図書は、P2 で描いた外形から作る。
// 図書の一覧は判定（requiredPermitDocuments）の結果で出す。要る・要らない（理由）・要確認（理由）の三区分。要確認は隠さない。
// 外形が閉じていなければ IFC と判定は出さず、「外形が未作成」と出す（ダミーの外形では代えない）。
// 壁厚は画面で変えられる（BIM の属性）。階数と階高は P2 の値を使う（P2 で変える）。
import { useMemo, useState } from 'react'
import { writeIfc, type IfcSchema } from '../ifc/writer'
import { findClosedOutline } from '../canvas/closure'
import { p2Entries, useDrawing } from '../store/drawing'
import { usePermitProject } from '../store/permitProject'
import { APP_STRUCTURE, APP_USAGE, APP_WORK_KIND, permitInputFromVolume } from '../law/permitInput'
import { AREA_REFERENCE_NOTE, FIFTH_OPEN_NOTE, LIMIT_SOURCE, NEW_BUILDING_NOTE, THIRD_OPEN_NOTES, fifthSheetOf, fireLabelOf, formValuesFromVolume, frontEdgeLengthM, limitNotesOf, siteAreaM2Of, zoneLimitsOf, zoneNameOf } from '../law/permitFormValues'
import { unwrittenNotesOf } from '../law/permitFormNotes'
import { floorSheetRestNoteOf } from '../law/floorSheet'
import { chibanOf } from '../map/parcelInfo'
import { parcelPropsOf } from '../map/selectedParcel'
import { requiredPermitDocuments } from '../law/permitRequired'
import { drawingAreaOf, frameSvg } from '../law/permitFrameSvg'
import { floorPlanOf, siteLayoutStateOf, siteMissingTextOf } from '../export/drawingSvg'
import { DRAWING_MISSING_DEFAULT } from '../permit/permitViewer'
import { lotOfConfirmed, useConfirmedSite } from '../store/confirmedSite'
import { neighborOutlinesOf } from '../volume/neighborFrame'
import { objectSourcesOfPlan } from '../plan/objectSourcesOfPlan'
import { PermitViewer } from './PermitViewer'
import { PermitFormImport } from './PermitFormImport'
import { PermitFormPlan } from './PermitFormPlan'
import { usePermitForms } from '../store/permitForms'
import permitDocsJson from '../law/permitDocuments.json'
import { buildZip } from '../export/zipWriter'
import { permitPackageFilesOf } from '../export/permitPackage'
import { applicabilityTextOf, frameSizeOf, judgementRowsOf, legalCheckOfDoc, outlineStateOf, volumeOfOutline } from '../permit/p5Judgement'
import { classLabelsOf } from '../law/buildingClass'
import { fireZoneClass, type FireZone } from '../law/fireZoneClass'
import { fireStructureItems } from '../law/fireStructure'
import { COMPONENTS, judgeComponent, requiredMinutes } from '../law/structureFire'
import { ICHI_NOTE, judgeIchi } from '../law/fireIchi'
import { useComponentFire } from '../store/componentFire'
import { useSite } from '../store/site'
import { cutFloorAreasOf, grossFloorAreaMm2 } from '../volume/cutVolume'
import { isRightItemShown, useActiveMode } from '../store/mode'
import { SCREEN_MODES } from '../app/screenModes'
import { usePanelTiles } from '../store/panelTiles'
import { PanelTile } from './PanelTile'
import { FeatureAdjustTile } from './FeatureAdjustTile'
import { useDevTools } from '../store/devTools'
import { PermitProjectFields } from './PermitProjectFields'

const TONE_COLOR = { ok: '#2f7a4f', warn: '#a86b00', none: '#666' } as const

export function P5Output() {
  const devShown = useDevTools((s) => s.shown)
  const [schema, setSchema] = useState<IfcSchema>('IFC4')
  const [wallText, setWallText] = useState('200')
  const [fireZone, setFireZone] = useState<FireZone>('なし')
  const componentRatings = useComponentFire((st) => st.ratings)
  const setComponentRating = useComponentFire((st) => st.setRating)
  const fireDoor = useComponentFire((st) => st.fireDoor)
  const setFireDoor = useComponentFire((st) => st.setFireDoor)
  const [tab, setTab] = useState<'bim' | 'pdf'>('bim')
  const [frame, setFrame] = useState<'A3横' | 'A1'>('A3横')
  const [applicant, setApplicant] = useState('')
  const roadSlope = useSite((s) => s.roadSlope)
  const shadow = useSite((s) => s.shadow)
  // 案件の項目（ボリュームから決まらない条件）。P5 で入れる（t91）
  const project = usePermitProject((s) => s.project)
  const setProject = usePermitProject((s) => s.set)
  // P2 の外形と階数・階高（P2 の値）
  // 外形は P2 の線だけ（P3 の線は外形に入れない）
  const drawnAll = useDrawing((s) => s.entries)
  const entries = useMemo(() => p2Entries(drawnAll), [drawnAll])
  const storeys = useDrawing((s) => s.storeyCount)
  const height = useDrawing((s) => s.storeyHeightMm)
  // 右パネルの項目は、今のモードと画面の組で決まる（G100・G95）。P5 は System だけなので、機能の調整を出す（切替は出さない）
  const activeMode = useActiveMode('P5')
  const hiddenTiles = usePanelTiles((s) => s.hidden)
  const rightShown = (id: string) => isRightItemShown(SCREEN_MODES, activeMode, 'P5', hiddenTiles, id)

  const wall = Number(wallText)
  const wallOk = Number.isInteger(wall) && wall > 0

  const outline = useMemo(() => outlineStateOf(findClosedOutline(entries.flatMap((e) => e.segments))), [entries])
  const volumeResult = useMemo(() => (outline.ok ? volumeOfOutline(outline.footprint, storeys, height) : null), [outline, storeys, height])
  const volume = volumeResult?.ok ? volumeResult.volume : null
  const outlineReason = !outline.ok ? outline.reason : volumeResult && !volumeResult.ok ? volumeResult.reason : null
  // 延べ面積は、切り取った階の面積の和（統括の依頼 2026-11-06。依頼 5a・B）。切り取りは P2 の境界と、今の階数・階高から計算する
  const slopeBoundaries = useSite((s) => s.slopeBoundaries)
  const permitVolume = useMemo(
    () =>
      volume
        ? {
            ...volume,
            gross_floor_area_mm2: grossFloorAreaMm2(
              volume.gross_floor_area_mm2,
              cutFloorAreasOf(outline.ok ? outline.footprint : [], slopeBoundaries, { storey_count: storeys, storey_height: height }),
              storeys,
            ),
          }
        : null,
    [volume, outline, slopeBoundaries, storeys, height],
  )
  const grossM2 = permitVolume ? permitVolume.gross_floor_area_mm2 / 1_000_000 : 0
  const heightM = volume ? volume.total_height / 1000 : 0
  const judgement = useMemo(() => (permitVolume ? requiredPermitDocuments(permitInputFromVolume(permitVolume, project)) : null), [permitVolume, project])
  // 様式の欄に入れる値（ボリュームから決まるもの。案件の敷地面積は入力があるときだけ）
  // 記入する値。地名地番と敷地面積は、確定した筆のデータ（公図）から。筆が無ければ入らない
  const confirmedForForm = useConfirmedSite((s) => s.confirmed)
  const districtForForm = useConfirmedSite((s) => s.district.data)
  const formValues = useMemo(() => {
    if (!permitVolume) return {}
    const props = confirmedForForm?.parcelUid ? parcelPropsOf(confirmedForForm.parcelUid) : undefined
    const chiban = props ? chibanOf(props) : null
    const lotForForm = lotOfConfirmed(confirmedForForm)
    const frontLength = confirmedForForm && lotForForm ? frontEdgeLengthM(lotForForm, confirmedForForm.roadEdge) : undefined
    // 防火の区分は、確定の地点の法規（取れていなければ決めない）
    const fire = fireLabelOf(
      districtForForm === null ? null : { functions: districtForForm.fireMatches.map((f) => f.function), unknownOwner: districtForForm.fireUnknownOwner.length },
    )
    // 用途地域の名前と、容積率・建蔽率（地点の用途地域が一つのときだけ）
    const zoneName = districtForForm ? zoneNameOf(districtForForm.matches) : null
    const limits = districtForForm ? zoneLimitsOf(districtForForm.matches) : null
    return formValuesFromVolume(permitVolume, {
      structure: APP_STRUCTURE,
      usage: APP_USAGE,
      workKind: APP_WORK_KIND,
      ...(zoneName !== null ? { zoneName } : {}),
      ...(limits !== null ? { limits } : {}),
      siteAreaM2: siteAreaM2Of(lotForForm),
      ...(chiban !== null ? { chiban } : {}),
      ...(fire !== null ? { fire } : {}),
      ...(frontLength !== undefined ? { frontRoadLengthM: frontLength } : {}),
      // 前面道路の幅員と出どころ（確定のまとめの値。0 mm は未入力）
      ...(confirmedForForm && confirmedForForm.roadWidthMm > 0
        ? { frontRoadWidth: { mm: confirmedForForm.roadWidthMm, source: confirmedForForm.roadSource } }
        : {}),
    })
  }, [permitVolume, confirmedForForm, districtForForm])
  const ready = volume !== null
  const valid = ready && wallOk

  // IFC の文字（ビューアで件数と容量を出す。外形が閉じていなければ null）
  const ifcText = useMemo(() => {
    if (!outline.ok) return null
    try {
      return writeIfc({ footprint: outline.footprint, storey_count: storeys, storey_height: height, wallThicknessMm: wall, schema })
    } catch {
      return null
    }
  }, [outline, storeys, height, wall, schema])

  // 配置図と各階平面図の中身（図枠の作図領域の中）。元のデータが無いものは null
  const confirmedNow = useConfirmedSite((s) => s.confirmed)
  const buildingsNow = useConfirmedSite((s) => s.buildings)
  const planResult = useSite((s) => s.plan)
  const drawingSvgs = useMemo(() => {
    const size = frameSizeOf(frame)
    const area = drawingAreaOf(size)
    // 縮尺は、作図の領域に収まるいちばん大きい標準の縮尺。図枠の縮尺の欄に「1/○○」と書く
    const sheet = (body: string, denominator: number): string => frameSvg({ size, values: { scale: `1/${denominator}` }, body }).svg
    const siteState = siteLayoutStateOf({
      lot: lotOfConfirmed(confirmedNow),
      footprint: outline.ok ? outline.footprint : null,
      neighbors: neighborOutlinesOf(buildingsNow.data ?? [], confirmedNow?.frame ?? null),
      area,
    })
    const floorLayout =
      planResult === null
        ? null
        : floorPlanOf({
            widthMm: planResult.widthMm,
            depthMm: planResult.depthMm,
            gridLines: objectSourcesOfPlan(planResult, []).gridLines ?? [],
            units: planResult.cells,
            area,
          })
    return {
      site: siteState.kind === 'ok' ? sheet(siteState.body, siteState.denominator) : null,
      floorPlan: floorLayout === null ? null : sheet(floorLayout.body, floorLayout.denominator),
      // 作れないときの理由（縮尺が無い・敷地を確定していない で言い分ける）
      reasons: { site: siteMissingTextOf(siteState) ?? DRAWING_MISSING_DEFAULT.site, floorPlan: DRAWING_MISSING_DEFAULT.floorPlan },
    }
  }, [frame, confirmedNow, buildingsNow, outline, planResult])

  // 一式の中身（図面・IFC・書類一覧・空欄の一覧・記入した様式）。判定が無いときは null
  const filledNow = usePermitForms((s) => s.filled)
  const formsNow = usePermitForms((s) => s.forms)
  const packageFiles = useMemo(() => {
    if (!judgement) return null
    return permitPackageFilesOf({
      judgement,
      docs: permitDocsJson.documents,
      drawings: drawingSvgs,
      ifcText,
      ifcFileName: `model-${schema.toLowerCase()}.ifc`,
      filledForms: Object.values(filledNow).filter((x): x is { fileName: string; bytes: Uint8Array } => x !== undefined),
      // 敷地面積が公図の参考値なら、空欄の一覧に参考値の文を添える（統括の依頼 2026-11-06。3）
      // 幅員は出どころ（入力の値など）を添える（統括の依頼 2026-11-06）
      notes: [
        ...(formValues['F2-3-07.敷地面積']?.from === '公図の参考値' ? [AREA_REFERENCE_NOTE] : []),
        ...(formValues['F2-3-06.幅員'] !== undefined
          ? [`前面道路の幅員：${formValues['F2-3-06.幅員'].value} m（出どころ：${formValues['F2-3-06.幅員'].from}）`]
          : []),
        // 新築として、申請部分と合計に同じ値を書いた（統括の判断 2026-11-06）
        ...(formValues['F2-3-10'] !== undefined ? [NEW_BUILDING_NOTE] : []),
        // 第五面の未決（記号の表・枚数）は、書いたときに空欄の一覧に出す（調査の指摘 2026-11-06）
        ...(formValues['F2-5-07.床面積'] !== undefined ? [FIFTH_OPEN_NOTE] : []),
        // 容積率・建蔽率: 出典、または決まらない理由（統括の依頼 2026-11-06）
        ...(districtForForm === null
          ? ['容積率・建蔽率：地点の用途地域の値をまだ取っていない（空欄）']
          : limitNotesOf(zoneLimitsOf(districtForForm.matches))),
        ...(formValues['F2-3-07.容積率'] !== undefined || formValues['F2-3-07.建蔽率'] !== undefined ? [`容積率・建蔽率の出典：${LIMIT_SOURCE}`] : []),
        // 第三号だけの欄（人が入れる・別紙）。第三号が取り込まれているときに出す（統括の依頼 2026-11-06）
        ...(formsNow.F3 !== undefined ? THIRD_OPEN_NOTES : []),
        // 内容の違う階の第五面は、別紙（統括の決定 2026-11-06。B）
        ...(permitVolume !== null && floorSheetRestNoteOf(fifthSheetOf(permitVolume).rest) !== null
          ? [floorSheetRestNoteOf(fifthSheetOf(permitVolume).rest)!]
          : []),
        // 書けなかった欄（取り込んだ様式ごと）は、黙って抜かず、空欄の一覧に出す（統括の依頼 2026-11-06）
        ...unwrittenNotesOf(formsNow, formValues),
      ],
    })
  }, [judgement, drawingSvgs, ifcText, schema, filledNow, formValues, formsNow, districtForForm])

  // 一式を zip ひとつで出す（無圧縮）
  const downloadPackage = () => {
    if (!packageFiles) return
    const enc = new TextEncoder()
    const bytes = buildZip(packageFiles.map((f) => ({ path: f.path, data: f.bytes ?? enc.encode(f.text) })))
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/zip' }))
    const a = document.createElement('a')
    a.href = url
    a.download = '確認申請一式.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  const download = () => {
    if (!outline.ok) return
    const text = writeIfc({ footprint: outline.footprint, storey_count: storeys, storey_height: height, wallThicknessMm: wall, schema })
    const url = URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `model-${schema.toLowerCase()}.ifc`
    a.click()
    URL.revokeObjectURL(url)
  }

  const legal = { roadSlope, shadow, applicantFilled: applicant.trim() !== '' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', height: '100%' }}>
      <div style={{ padding: 16, maxWidth: 720 }}>
        <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>出力</h2>
        {outlineReason ? (
          <p style={{ color: '#a33' }}>{outlineReason}（ボリュームで外形を閉じてください。IFC と判定はそれまで出しません）</p>
        ) : (
          <p style={{ fontSize: 12, color: '#444' }}>
            ボリュームの外形から作る（階数 {storeys}・階高 {height.toLocaleString('ja-JP')} mm・高さ {heightM.toFixed(2)} m・延べ面積 {grossM2.toFixed(1)} ㎡）
          </p>
        )}

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <button type="button" aria-pressed={tab === 'bim'} onClick={() => setTab('bim')}>
            BIM 出力（IFC）
          </button>
          <button type="button" aria-pressed={tab === 'pdf'} onClick={() => setTab('pdf')}>
            建築確認申請
          </button>
        </div>

        {tab === 'bim' && (
          <>
            <section style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>BIM の属性</h3>
              <label style={{ display: 'block', marginBottom: 6 }}>
                壁厚 (mm)
                <input value={wallText} onChange={(e) => setWallText(e.target.value)} style={{ width: 120, marginLeft: 8 }} />
              </label>
              <label style={{ display: 'block', marginBottom: 6 }}>
                防火地域の区分（敷地の地点を人が選ぶ）
                <select value={fireZone} onChange={(e) => setFireZone(e.target.value as FireZone)} style={{ marginLeft: 8 }}>
                  <option value="なし">なし</option>
                  <option value="防火">防火地域</option>
                  <option value="準防火">準防火地域</option>
                </select>
              </label>
            </section>

            {ready ? (
              <p style={{ fontSize: 12, color: '#444', margin: '0 0 12px' }}>
                号区分（大規模の判定。ボリュームの外形の延べ面積と高さで数える。RC・共同住宅・区域内は仮置き）:{' '}
                {(() => {
                  const labels = classLabelsOf({
                    structure: 'RC',
                    heightM,
                    aboveGroundStoreys: storeys,
                    totalFloorAreaM2: grossM2,
                    specialUseAreaM2: grossM2,
                    inPlanningArea: true,
                  })
                  return `${labels.article6} ／ ${labels.article20}（出典: e-Gov 法令、第 20 条は抜粋の範囲）`
                })()}
              </p>
            ) : null}
            {ready && fireZone !== 'なし' ? (
              <div style={{ fontSize: 12, color: '#a86b00', margin: '0 0 12px' }}>
                {(() => {
                  const cls = fireZoneClass({ zone: fireZone, aboveGroundStoreys: storeys, floorAreaM2: grossM2, wood: false })
                  return (
                    <>
                      <p style={{ margin: '0 0 4px' }}>防火・準防火（{fireZone}地域）: 令 136 条の 2 {cls}</p>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {fireStructureItems(cls).map((i) => {
                          // イ（G85）: 主要構造部の耐火構造と、外壁開口部設備の防火設備で判定する。ロは計算せず対象外と出す
                          if (i.label.startsWith('イ')) {
                            const ichi = judgeIchi(storeys, { ratings: componentRatings, fireDoor })
                            return (
                              <li key={i.label}>
                                イ（主要構造部の耐火構造・外壁開口部設備の防火設備）: {ichi.result}
                                {ichi.reasons.length > 0 ? `（${ichi.reasons.join('、')}）` : ''}
                              </li>
                            )
                          }
                          if (i.label.startsWith('ロ')) return <li key={i.label}>{ICHI_NOTE}</li>
                          return <li key={i.label}>{i.label}: {i.status}（部材の耐火性能の入力が無い）</li>
                        })}
                      </ul>
                    </>
                  )
                })()}
              </div>
            ) : null}
            {ready ? (
              <section style={{ marginBottom: 12, fontSize: 12 }}>
                <strong>部材の耐火時間（令 107 条。入力した分を、階数の区分の必要時間と比べる）</strong>
                <label style={{ display: 'block', margin: '6px 0' }}>
                  外壁開口部設備（防火設備か。イの入力）{' '}
                  <select value={fireDoor === null ? '' : fireDoor ? 'yes' : 'no'} onChange={(e) => setFireDoor(e.target.value === '' ? null : e.target.value === 'yes')}>
                    <option value="">未入力</option>
                    <option value="yes">防火設備</option>
                    <option value="no">防火設備ではない</option>
                  </select>
                </label>
                <table style={{ borderCollapse: 'collapse', marginTop: 4 }}>
                  <thead>
                    <tr>
                      <th align="left">部材</th>
                      <th align="right">必要（分）</th>
                      <th align="left">入力（分）</th>
                      <th align="left">判定</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPONENTS.map((c) => {
                      const rating = componentRatings[c] ?? null
                      return (
                        <tr key={c}>
                          <td>{c}</td>
                          <td align="right">{requiredMinutes(c, storeys)}</td>
                          <td>
                            <select value={rating ?? ''} onChange={(e) => setComponentRating(c, e.target.value === '' ? null : Number(e.target.value))}>
                              <option value="">未入力</option>
                              {[30, 60, 90, 120, 150, 180].map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </td>
                          <td>{judgeComponent(c, storeys, rating)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </section>
            ) : null}
            <section style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>IFC の件数</h3>
              {valid ? (
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr>
                      <th align="left">オブジェクト</th>
                      <th align="right">件数</th>
                      <th align="left">備考</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>IfcBuildingStorey</td>
                      <td align="right">{storeys}</td>
                      <td>階高 {height.toLocaleString('ja-JP')} mm</td>
                    </tr>
                    <tr>
                      <td>IfcWall</td>
                      <td align="right">{outline.ok ? outline.footprint.length * storeys : '—'}</td>
                      <td>外形の辺 × 階数。厚さ {wall} mm</td>
                    </tr>
                    {['IfcColumn', 'IfcBeam', 'IfcSlab', 'IfcOpeningElement', 'IfcSpace'].map((name) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td align="right">—</td>
                        <td style={{ color: '#666' }}>未対応（柱・梁・スラブ・開口・部屋はモデルに無い）</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: '#a33' }}>外形が閉じていて、壁厚は 1 以上の整数で入れてください。</p>
              )}
            </section>

            <section style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>IFC 書き出し</h3>
              <div style={{ marginBottom: 8 }}>
                版:{' '}
                {(['IFC4', 'IFC2X3'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={schema === s}
                    className={schema === s ? 'is-active' : undefined}
                    onClick={() => setSchema(s)}
                    style={{ marginLeft: 6 }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button type="button" onClick={download} disabled={!valid}>
                IFC を書き出す
              </button>
              <p style={{ color: '#666', fontSize: 12 }}>IFC4 は円弧を曲線のまま、IFC2X3 は折れ線で書く。開口・什器・縦シャフトは未対応。</p>
            </section>
          </>
        )}

        {tab === 'pdf' && (
          <>
            <section style={{ marginBottom: 16 }}>
              <PermitFormImport />
            </section>

            <section style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>取り込んだ様式の欄（アプリが何をするか）</h3>
              <PermitFormPlan values={formValues} />
            </section>

            <section style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>案件の項目（ボリュームから決まらない条件）</h3>
              <PermitProjectFields project={project} onChange={setProject} />
            </section>

            {judgement ? (
              <>
                <div className="permit-print">
                  <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>建築確認申請 図書一覧</h2>
                  <p style={{ fontSize: 12, margin: '0 0 8px' }}>
                    申請者: {applicant.trim() === '' ? '未記入' : applicant} ／ 図枠: {frame}
                  </p>
                  <p style={{ fontSize: 12, margin: '0 0 8px' }}>{applicabilityTextOf(judgement)}</p>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th align="left" style={{ borderBottom: '1px solid #000' }}>区分</th>
                        <th align="left" style={{ borderBottom: '1px solid #000' }}>図書</th>
                        <th align="left" style={{ borderBottom: '1px solid #000' }}>理由</th>
                      </tr>
                    </thead>
                    <tbody>
                      {judgementRowsOf(judgement).map((r) => (
                        <tr key={`${r.kind}-${r.name}`}>
                          <td style={{ borderBottom: '1px solid #ccc', padding: '4px' }}>{r.kind}</td>
                          <td style={{ borderBottom: '1px solid #ccc', padding: '4px' }}>{r.name}</td>
                          <td style={{ borderBottom: '1px solid #ccc', padding: '4px' }}>{r.reason ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div dangerouslySetInnerHTML={{ __html: frameSvg({ size: frameSizeOf(frame), values: {} }).svg }} />
                </div>

                <section style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>図書の一覧（見て確かめる）</h3>
                  <PermitViewer
                    judgement={judgement}
                    docs={permitDocsJson.documents}
                    ifcText={ifcText}
                    drawingSvgs={drawingSvgs}
                    drawingReasons={drawingSvgs.reasons}
                    filledForms={filledNow}
                    checkOf={(name) => {
                      const c = legalCheckOfDoc(name, legal)
                      return c ? { text: c.text, color: TONE_COLOR[c.tone] } : null
                    }}
                  />
                </section>

                <section style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>申請者と図枠</h3>
                  <label style={{ display: 'block', marginBottom: 6 }}>
                    申請者
                    <input value={applicant} onChange={(e) => setApplicant(e.target.value)} style={{ width: 240, marginLeft: 8 }} />
                  </label>
                  <div style={{ marginBottom: 8 }}>
                    図枠:{' '}
                    {(['A3横', 'A1'] as const).map((f) => (
                      <button key={f} type="button" aria-pressed={frame === f} onClick={() => setFrame(f)} style={{ marginLeft: 6 }}>
                        {f}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => window.print()}>
                    印刷・PDF に保存
                  </button>
                  <button type="button" onClick={downloadPackage} disabled={!packageFiles}>
                    一式を zip で出す
                  </button>
                  <p style={{ color: '#666', fontSize: 12 }}>
                    ブラウザの印刷で PDF にする。
                  </p>
                  <style>{`.permit-print{display:none}@media print{@page{size:${frame === 'A1' ? 'A1 landscape' : 'A3 landscape'};margin:12mm}body *{visibility:hidden}.permit-print,.permit-print *{visibility:visible}.permit-print{display:block;position:absolute;left:0;top:0;width:100%;color:#000;background:#fff}}`}</style>
                </section>
              </>
            ) : (
              <p style={{ color: '#a33' }}>{outlineReason ?? '外形が未作成'}</p>
            )}
          </>
        )}
      </div>
      <aside style={{ padding: 12, borderLeft: '1px solid #ddd8cc', background: '#fff', overflowY: 'auto' }}>
        {!rightShown('feature-adjust') || !devShown ? null : (
          <PanelTile title="機能の調整" onHide={() => usePanelTiles.getState().hideTile('feature-adjust')}>
            <h2>機能の調整</h2>
            <FeatureAdjustTile screen="P5" />
          </PanelTile>
        )}
      </aside>
    </div>
  )
}
