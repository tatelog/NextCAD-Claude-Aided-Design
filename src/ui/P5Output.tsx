// P5 出力（D-04 P5、D-02 C9・C10・C11）。IFC は実際に書き出せる。申請 PDF と法的チェックは未決のため出さない。
// IFC の書き出しは、ダミーの外形（20 m × 30 m、3 階）で行う。線の位置は P2 で描いた外形ではない。
import { writeIfc } from '../ifc/writer'

const DUMMY = {
  footprint: [
    { x: 0, y: 0 },
    { x: 20_000, y: 0 },
    { x: 20_000, y: 30_000 },
    { x: 0, y: 30_000 },
  ],
  storey_count: 3,
  storey_height: 3_000,
}

export function P5Output() {
  const download = (schema: 'IFC4' | 'IFC2X3') => {
    const text = writeIfc({ ...DUMMY, schema, wallThicknessMm: 200 })
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
      <p style={{ color: '#a33' }}>注: 書き出すのはダミーの外形（20 m × 30 m、3 階、階高 3 m、壁厚 200 mm）。P2 で描いた外形ではありません。</p>
      <section style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>BIM（IFC）</h3>
        <button type="button" onClick={() => download('IFC4')} style={{ marginRight: 8 }}>
          IFC4 で書き出す（既定）
        </button>
        <button type="button" onClick={() => download('IFC2X3')}>IFC2X3 で書き出す</button>
        <p style={{ color: '#666', fontSize: 12 }}>階と壁だけを書く。曲線の外形・開口・什器・縦シャフトは未対応（D-02 C9）。</p>
      </section>
      <section>
        <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>確認申請の書類（PDF）</h3>
        <p>未決（図書ルールと図枠が未決。D-02 C10）。出せるものから出す方針。</p>
      </section>
      <section>
        <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>法的チェック</h3>
        <p>未決（検査項目の範囲が未決。D-02 C11）。斜線・日影・建蔽率・容積率の再確認のみ。斜線の値が未決のため未実施。</p>
      </section>
    </div>
  )
}
