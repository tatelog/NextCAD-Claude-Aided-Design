// P5 出力（D-04 P5、D-02 C9・C10・C11）。IFC は実際に書き出せる。確認申請の図書一覧と図書ごとの法的チェックは出す。
// 申請 PDF の書き出しは未実装（図枠の規定と書式一式は未決。D-02 C10）。
// IFC の書き出しは、ダミーの外形（20 m × 30 m）で行う。線の位置は P2 で描いた外形ではない。
// 壁厚と階高は画面で変えられる（モックのとおり。2D への返りは P2 の外形の画面で行う）。
import { useState } from 'react'
import { writeIfc, type IfcSchema } from '../ifc/writer'
import { SHEETS, legalCheckFor } from '../permit/sheetList'
import { classLabelsOf } from '../law/buildingClass'
import { fireZoneClass, type FireZone } from '../law/fireZoneClass'
import { fireStructureItems } from '../law/fireStructure'
import { COMPONENTS, judgeComponent, requiredMinutes } from '../law/structureFire'
import { ICHI_NOTE, judgeIchi } from '../law/fireIchi'
import { useComponentFire } from '../store/componentFire'
import { useSite } from '../store/site'
import { isRightItemShown, useActiveMode } from '../store/mode'
import { SCREEN_MODES } from '../app/screenModes'
import { usePanelTiles } from '../store/panelTiles'
import { PanelTile } from './PanelTile'
import { ChatTile } from './ChatTile'

const TONE_COLOR = { ok: '#2f7a4f', warn: '#a86b00', none: '#666' } as const

// 仮の外周（20 m × 30 m）の床面積（㎡）
const DUMMY_AREA_M2 = 600

const DUMMY_FOOTPRINT = [
  { x: 0, y: 0 },
  { x: 20_000, y: 0 },
  { x: 20_000, y: 30_000 },
  { x: 0, y: 30_000 },
]

export function P5Output() {
  const [schema, setSchema] = useState<IfcSchema>('IFC4')
  const [wallText, setWallText] = useState('200')
  const [heightText, setHeightText] = useState('3000')
  const [storeysText, setStoreysText] = useState('3')
  const [fireZone, setFireZone] = useState<FireZone>('なし')
  const componentRatings = useComponentFire((st) => st.ratings)
  const setComponentRating = useComponentFire((st) => st.setRating)
  const fireDoor = useComponentFire((st) => st.fireDoor)
  const setFireDoor = useComponentFire((st) => st.setFireDoor)
  const [tab, setTab] = useState<'bim' | 'pdf'>('bim')
  const [frame, setFrame] = useState<'A3横' | 'A1'>('A3横')
  const [applicant, setApplicant] = useState('')
  const [onSheets, setOnSheets] = useState<Record<string, boolean>>(() => Object.fromEntries(SHEETS.map((s) => [s.name, true])))
  const roadSlope = useSite((s) => s.roadSlope)
  const shadow = useSite((s) => s.shadow)
  // 右パネルの項目は、今のモードと画面の組で決まる（G100・G95）。P5 はチャットだけ（右パネルは P5 で出す）
  const activeMode = useActiveMode('P5')
  const hiddenTiles = usePanelTiles((s) => s.hidden)
  const rightShown = (id: string) => isRightItemShown(SCREEN_MODES, activeMode, 'P5', hiddenTiles, id)

  const wall = Number(wallText)
  const height = Number(heightText)
  const storeys = Number(storeysText)
  const valid = Number.isInteger(wall) && wall > 0 && Number.isInteger(height) && height > 0 && Number.isInteger(storeys) && storeys >= 1

  const download = () => {
    const text = writeIfc({ footprint: DUMMY_FOOTPRINT, storey_count: storeys, storey_height: height, wallThicknessMm: wall, schema })
    const url = URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `model-${schema.toLowerCase()}.ifc`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', height: '100%' }}>
      <div style={{ padding: 16, maxWidth: 720 }}>
        <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>P5 出力</h2>
        <p style={{ color: '#a33' }}>注: 書き出すのはダミーの外形（20 m × 30 m）。P2 で描いた外形ではありません。</p>

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
            階高 (mm)
            <input value={heightText} onChange={(e) => setHeightText(e.target.value)} style={{ width: 120, marginLeft: 8 }} />
          </label>
          <label style={{ display: 'block', marginBottom: 6 }}>
            階数
            <input value={storeysText} onChange={(e) => setStoreysText(e.target.value)} style={{ width: 120, marginLeft: 8 }} />
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

        {valid ? (
          <p style={{ fontSize: 12, color: '#444', margin: '0 0 12px' }}>
            号区分（大規模の判定。仮の外周 20 m × 30 m・RC・共同住宅として数える。区域内は仮置き）:{' '}
            {(() => {
              const labels = classLabelsOf({
                structure: 'RC',
                heightM: (storeys * height) / 1000,
                aboveGroundStoreys: storeys,
                totalFloorAreaM2: DUMMY_AREA_M2 * storeys,
                specialUseAreaM2: DUMMY_AREA_M2 * storeys,
                inPlanningArea: true,
              })
              return `${labels.article6} ／ ${labels.article20}（出典: e-Gov 法令、第 20 条は抜粋の範囲）`
            })()}
          </p>
        ) : null}
        {valid && fireZone !== 'なし' ? (
          <div style={{ fontSize: 12, color: '#a86b00', margin: '0 0 12px' }}>
            {(() => {
              const cls = fireZoneClass({ zone: fireZone, aboveGroundStoreys: storeys, floorAreaM2: DUMMY_AREA_M2 * storeys, wood: false })
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
        {valid ? (
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
                  <td align="right">{4 * storeys}</td>
                  <td>外形の辺 4 × 階数。厚さ {wall} mm</td>
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
            <p style={{ color: '#a33' }}>壁厚・階高・階数は整数で、1 以上を入れてください。</p>
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
            <div className="permit-print">
              <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>建築確認申請 図書一覧</h2>
              <p style={{ fontSize: 12, margin: '0 0 8px' }}>
                議論用・未確定 ／ 申請者: {applicant.trim() === '' ? '未記入' : applicant} ／ 図枠: {frame}
              </p>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th align="left" style={{ borderBottom: '1px solid #000' }}>図書</th>
                    <th align="left" style={{ borderBottom: '1px solid #000' }}>根拠</th>
                    <th align="left" style={{ borderBottom: '1px solid #000' }}>法的チェック</th>
                  </tr>
                </thead>
                <tbody>
                  {SHEETS.filter((s) => onSheets[s.name]).map((s) => (
                    <tr key={s.name}>
                      <td style={{ borderBottom: '1px solid #ccc', padding: '4px' }}>{s.name}</td>
                      <td style={{ borderBottom: '1px solid #ccc', padding: '4px' }}>{s.basis}</td>
                      <td style={{ borderBottom: '1px solid #ccc', padding: '4px' }}>
                        {legalCheckFor(s, { roadSlope, shadow, applicantFilled: applicant.trim() !== '' }).text}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <section style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>図書一覧と法的チェック</h3>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th align="left">図書</th>
                    <th align="left">根拠</th>
                    <th align="left">出す</th>
                    <th align="left">法的チェック</th>
                  </tr>
                </thead>
                <tbody>
                  {SHEETS.map((s) => {
                    const check = legalCheckFor(s, { roadSlope, shadow, applicantFilled: applicant.trim() !== '' })
                    return (
                      <tr key={s.name}>
                        <td>
                          {s.name}
                          {!s.confirmed && <span style={{ color: '#a86b00', marginLeft: 6, fontSize: 12 }}>要確認</span>}
                        </td>
                        <td style={{ color: '#666', fontSize: 12 }}>{s.basis}</td>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`${s.name} を出す`}
                            checked={onSheets[s.name] ?? false}
                            onChange={(e) => setOnSheets((prev) => ({ ...prev, [s.name]: e.target.checked }))}
                          />
                        </td>
                        <td style={{ color: TONE_COLOR[check.tone] }}>{check.text}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p style={{ color: '#666', fontSize: 12 }}>
                図書の範囲は施行規則 第1条の3 と表一・表二（RC 造の共同住宅）から。書式一式は自治体と申請の種類で変わるため未決。日影図は適用条件と条例値が未確認のため「要確認」。
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
                ブラウザの印刷で PDF にする。図枠の寸法は A3 横・A1 横の用紙サイズだけで、図枠の罫線の規定と書式一式は未決（D-02 C10）。
              </p>
              <style>{`.permit-print{display:none}@media print{@page{size:${frame === 'A1' ? 'A1 landscape' : 'A3 landscape'};margin:12mm}body *{visibility:hidden}.permit-print,.permit-print *{visibility:visible}.permit-print{display:block;position:absolute;left:0;top:0;width:100%;color:#000;background:#fff}}`}</style>
            </section>
          </>
        )}
      </div>
      <aside style={{ padding: 12, borderLeft: '1px solid #ddd8cc', background: '#fff', overflowY: 'auto' }}>
        {!rightShown('claude-chat') ? null : (
          <PanelTile title="Claude（チャット）" onHide={() => usePanelTiles.getState().hideTile('claude-chat')}>
            <h2>Claude（チャット）</h2>
            <ChatTile screen="P5" />
          </PanelTile>
        )}
      </aside>
    </div>
  )
}
