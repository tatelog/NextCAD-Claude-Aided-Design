// P5 出力（D-04 P5、D-02 C9・C10・C11、t91・G46）。IFC と確認申請の図書は、P2 で描いた外形から作る。
// 図書の一覧は判定（requiredPermitDocuments）の結果で出す。要る・要らない（理由）・要確認（理由）の三区分。要確認は隠さない。
// 外形が閉じていなければ IFC と判定は出さず、「外形が未作成」と出す（ダミーの外形では代えない）。
// 壁厚は画面で変えられる（BIM の属性）。階数と階高は P2 の値を使う（P2 で変える）。
import { useMemo, useState } from 'react'
import { writeIfc, type IfcSchema } from '../ifc/writer'
import { findClosedOutline } from '../canvas/closure'
import { p2Entries, useDrawing } from '../store/drawing'
import { usePermitProject } from '../store/permitProject'
import { permitInputFromVolume } from '../law/permitInput'
import { requiredPermitDocuments } from '../law/permitRequired'
import { frameSvg } from '../law/permitFrameSvg'
import { applicabilityTextOf, frameSizeOf, judgementRowsOf, legalCheckOfDoc, outlineStateOf, volumeOfOutline, type JudgementKind } from '../permit/p5Judgement'
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
import { PermitProjectFields } from './PermitProjectFields'

const KIND_COLOR: Record<JudgementKind, string> = { 要る: '#1f2a44', 要らない: '#666', 要確認: '#a86b00' }
const TONE_COLOR = { ok: '#2f7a4f', warn: '#a86b00', none: '#666' } as const

export function P5Output() {
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
  const ready = volume !== null
  const valid = ready && wallOk

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
        <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>P5 出力</h2>
        {outlineReason ? (
          <p style={{ color: '#a33' }}>{outlineReason}（P2 で外形を閉じてください。IFC と判定はそれまで出しません）</p>
        ) : (
          <p style={{ fontSize: 12, color: '#444' }}>
            P2 の外形から作る（階数 {storeys}・階高 {height.toLocaleString('ja-JP')} mm・高さ {heightM.toFixed(2)} m・延べ面積 {grossM2.toFixed(1)} ㎡）
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
                防火地域の区分（P1 の地点を人が選ぶ。自動の接続は未了）
                <select value={fireZone} onChange={(e) => setFireZone(e.target.value as FireZone)} style={{ marginLeft: 8 }}>
                  <option value="なし">なし</option>
                  <option value="防火">防火地域</option>
                  <option value="準防火">準防火地域</option>
                </select>
              </label>
            </section>

            {ready ? (
              <p style={{ fontSize: 12, color: '#444', margin: '0 0 12px' }}>
                号区分（大規模の判定。P2 の外形の延べ面積と高さで数える。RC・共同住宅・区域内は仮置き）:{' '}
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
                          return <li key={i.label}>{i.label}: {i.status}（部材の耐火性能の入力が無い。ハブ G28）</li>
                        })}
                      </ul>
                    </>
                  )
                })()}
              </div>
            ) : null}
            {ready ? (
              <section style={{ marginBottom: 12, fontSize: 12 }}>
                <strong>部材の耐火時間（令 107 条。入力した分を、階数の区分の必要時間と比べる。G28）</strong>
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
              <p style={{ color: '#666', fontSize: 12 }}>IFC4 は円弧を曲線のまま、IFC2X3 は折れ線で書く（D-02 C9）。開口・什器・縦シャフトは未対応。</p>
            </section>
          </>
        )}

        {tab === 'pdf' && (
          <>
            <section style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>案件の項目（ボリュームから決まらない条件）</h3>
              <PermitProjectFields project={project} onChange={setProject} />
            </section>

            {judgement ? (
              <>
                <div className="permit-print">
                  <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>建築確認申請 図書一覧</h2>
                  <p style={{ fontSize: 12, margin: '0 0 8px' }}>
                    議論用・未確定 ／ 申請者: {applicant.trim() === '' ? '未記入' : applicant} ／ 図枠: {frame}
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
                  <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>図書の判定（要る・要らない・要確認）</h3>
                  <p style={{ fontSize: 12, color: '#444' }}>{applicabilityTextOf(judgement)}</p>
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                      <tr>
                        <th align="left">区分</th>
                        <th align="left">図書</th>
                        <th align="left">理由・法的チェック</th>
                      </tr>
                    </thead>
                    <tbody>
                      {judgementRowsOf(judgement).map((r) => {
                        const check = r.kind === '要る' ? legalCheckOfDoc(r.name, legal) : null
                        return (
                          <tr key={`${r.kind}-${r.name}`}>
                            <td style={{ color: KIND_COLOR[r.kind], fontWeight: r.kind === '要確認' ? 700 : 400 }}>{r.kind}</td>
                            <td>{r.name}</td>
                            <td style={{ fontSize: 12 }}>
                              {r.reason ? <span style={{ color: '#666' }}>{r.reason}</span> : null}
                              {check ? <span style={{ color: TONE_COLOR[check.tone], marginLeft: r.reason ? 8 : 0 }}>{check.text}</span> : null}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <p style={{ color: '#666', fontSize: 12 }}>
                    要確認は判定できなかった図書で、理由を出しています。要らないは条件に当たらなかった理由です。図書の範囲は施行規則 第1条の3 と表一・表二から。
                  </p>
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
                  <p style={{ color: '#666', fontSize: 12 }}>
                    ブラウザの印刷で PDF にする。図枠の罫線の規定と書式一式は未決（D-02 C10）。
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
        {!rightShown('feature-adjust') ? null : (
          <PanelTile title="機能の調整（G43）" onHide={() => usePanelTiles.getState().hideTile('feature-adjust')}>
            <h2>機能の調整（G43）</h2>
            <FeatureAdjustTile screen="P5" />
          </PanelTile>
        )}
      </aside>
    </div>
  )
}
