// P3 平面（D-04 P3、D-02 C6）。柱割りの通り芯を既定スパンで割り付ける。
// 既定スパンと許容範囲は未決（D-02 C6）。画面では利用者が入れた値だけで計算する。
import { useState } from 'react'
import { checkSpan, gridLines } from '../plan/grid'

export function P3Plan() {
  const [lengthText, setLengthText] = useState('10000')
  const [spanText, setSpanText] = useState('3000')
  const [minText, setMinText] = useState('')
  const [maxText, setMaxText] = useState('')

  let lines: number[] | null = null
  let error: string | null = null
  try {
    lines = gridLines(Number(lengthText), Number(spanText))
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  const range = minText !== '' && maxText !== '' ? { minMm: Number(minText), maxMm: Number(maxText) } : null
  let judge: string = '許容範囲は未決（D-02 C6）'
  if (range && Number.isFinite(range.minMm) && Number.isFinite(range.maxMm)) {
    try {
      judge = checkSpan(Number(spanText), range)
    } catch {
      judge = '入力エラー'
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', height: '100%' }}>
      <div style={{ padding: 16, overflow: 'auto' }}>
        {error ? (
          <p style={{ color: '#a33' }}>{error}</p>
        ) : (
          <svg width="100%" viewBox={`-500 -500 ${Number(lengthText) + 1000} 1000`} style={{ maxHeight: '70vh', background: '#fff', border: '1px solid #ddd8cc' }}>
            {lines!.map((x) => (
              <line key={x} x1={x} y1={-300} x2={x} y2={300} stroke="#1f2a44" strokeWidth={20} />
            ))}
          </svg>
        )}
      </div>
      <aside style={{ padding: 12, borderLeft: '1px solid #ddd8cc', background: '#fff' }}>
        <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>P3 平面（柱割り）</h2>
        <label style={{ display: 'block', marginBottom: 6 }}>
          通りの長さ (mm)
          <input value={lengthText} onChange={(e) => setLengthText(e.target.value)} style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 6 }}>
          スパン (mm)
          <input value={spanText} onChange={(e) => setSpanText(e.target.value)} style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 6 }}>
          許容範囲 最小 (mm)
          <input value={minText} onChange={(e) => setMinText(e.target.value)} placeholder="未決" style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          許容範囲 最大 (mm)
          <input value={maxText} onChange={(e) => setMaxText(e.target.value)} placeholder="未決" style={{ width: '100%' }} />
        </label>
        <p>判定: {judge}</p>
        <p style={{ color: '#666' }}>通り芯の数: {lines ? lines.length : '—'}</p>
        <p style={{ color: '#666' }}>住戸数・意味判定は未接続（Worker・閉合の検査の決定待ち）。</p>
      </aside>
    </div>
  )
}
