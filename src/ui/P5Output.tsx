// P5 出力（D-04 P5、D-02 C9・C10・C11）。IFC は実際に書き出せる。確認申請の図書一覧と図書ごとの法的チェックは出す。
// 申請 PDF の書き出しは未実装（図枠の規定と書式一式は未決。D-02 C10）。
// IFC の書き出しは、ダミーの外形（20 m × 30 m）で行う。線の位置は P2 で描いた外形ではない。
// 壁厚と階高は画面で変えられる（モックのとおり。2D への返りは P2 の外形の画面で行う）。
import { useState } from 'react'
import { writeIfc, type IfcSchema } from '../ifc/writer'
import { SHEETS, legalCheckFor } from '../permit/sheetList'
import { useSite } from '../store/site'

const TONE_COLOR = { ok: '#2f7a4f', warn: '#a86b00', none: '#666' } as const

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
  const [tab, setTab] = useState<'bim' | 'pdf'>('bim')
  const [frame, setFrame] = useState<'A3横' | 'A1'>('A3横')
  const [applicant, setApplicant] = useState('')
  const [onSheets, setOnSheets] = useState<Record<string, boolean>>(() => Object.fromEntries(SHEETS.map((s) => [s.name, true])))
  const roadSlope = useSite((s) => s.roadSlope)

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
      </section>

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
                  const check = legalCheckFor(s, { roadSlope, shadow: null, applicantFilled: applicant.trim() !== '' })
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
            <button type="button" disabled>
              PDF を出す（未実装）
            </button>
            <p style={{ color: '#666', fontSize: 12 }}>
              PDF の書き出しは、図枠の寸法規定と書式が決まってから作る（D-02 C10）。今は図書の一覧と、図書ごとの法的チェックまで。
            </p>
          </section>
        </>
      )}
    </div>
  )
}
