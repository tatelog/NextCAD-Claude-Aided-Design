// P5 出力（D-04 P5、D-02 C9・C10・C11）。IFC は実際に書き出せる。申請 PDF と法的チェックは未実装（図書ルールと図枠は未決。D-02 C10）。
// IFC の書き出しは、ダミーの外形（20 m × 30 m）で行う。線の位置は P2 で描いた外形ではない。
// 壁厚と階高は画面で変えられる（モックのとおり。2D への返りは P2 の外形の画面で行う）。
import { useState } from 'react'
import { writeIfc, type IfcSchema } from '../ifc/writer'

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

      <section>
        <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>確認申請の書類（PDF）</h3>
        <p style={{ color: '#666' }}>未実装。図書の一覧と図枠は、ハブでは未決（D-02 C10）。モックの図書一覧を採るか、ハブを正とするかで作り方が変わる。</p>
      </section>
      <section>
        <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>法的チェック</h3>
        <p style={{ color: '#666' }}>未実装。斜線・日影の値の確認と、検査項目の範囲が要る（D-02 C11）。</p>
      </section>
    </div>
  )
}
