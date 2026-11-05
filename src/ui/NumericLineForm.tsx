// 数値入力（ハブ D-04 共通部品「数値入力」。置くかどうかは未決。仮置き）。P2 の右パネルで、始点・長さ・角度を数字で入れて線を一本入れる。
// 円弧は二つ（G130・t70）: 中心 → 始点 → 終点（中心と R の起点を先に置く）、と、二点＋中心線上のずらし量。
// 入力の確かめと線の作成は numericLine.ts に任せる。ここは入力欄と案内だけ。
import { useState } from 'react'
import { addArcCenterStroke, addArcTwoPointStroke, addNumericLine } from '../input/numericLine'

// 円弧（中心方式。中心・始点・終点、mm）の入力欄の並び（G130）
const ARC_CENTER_LABELS = ['中心 x', '中心 y', '始点 x', '始点 y', '終点 x', '終点 y'] as const
// 円弧（二点方式。二点とずらし量、mm）の入力欄の並び（t70）
const ARC_TWO_LABELS = ['二点 1 x', '二点 1 y', '二点 2 x', '二点 2 y', '中心線上のずらし（正は左）'] as const

export function NumericLineForm() {
  const [x, setX] = useState('0')
  const [y, setY] = useState('0')
  const [length, setLength] = useState('1000')
  const [angle, setAngle] = useState('0')
  const [message, setMessage] = useState<string | null>(null)
  // 円弧（中心方式）。既定は中心 (0,0)・始点 (1000,0)・終点 (0,1000) の 4 分の 1 の弧（仮置き）
  const [arcText, setArcText] = useState<string[]>(['0', '0', '1000', '0', '0', '1000'])
  const [arcMessage, setArcMessage] = useState<string | null>(null)
  // 円弧（二点方式）。既定は (−1000,0)・(1000,0) を結ぶ弦に、ずらし 1000 の弧（仮置き）
  const [twoText, setTwoText] = useState<string[]>(['-1000', '0', '1000', '0', '1000'])
  const [twoMessage, setTwoMessage] = useState<string | null>(null)

  const putArcCenter = () => {
    const values = arcText.map((v) => Number(v))
    if (values.some((v) => !Number.isFinite(v))) {
      setArcMessage('数字を入れてください')
      return
    }
    const r = (n: number) => Math.round(n)
    try {
      addArcCenterStroke({ x: r(values[0]!), y: r(values[1]!) }, { x: r(values[2]!), y: r(values[3]!) }, { x: r(values[4]!), y: r(values[5]!) })
      setArcMessage(null)
    } catch (e) {
      setArcMessage(e instanceof Error ? e.message : String(e))
    }
  }

  const putArcTwo = () => {
    const values = twoText.map((v) => Number(v))
    if (values.some((v) => !Number.isFinite(v))) {
      setTwoMessage('数字を入れてください')
      return
    }
    const r = (n: number) => Math.round(n)
    try {
      addArcTwoPointStroke({ x: r(values[0]!), y: r(values[1]!) }, { x: r(values[2]!), y: r(values[3]!) }, values[4]!)
      setTwoMessage(null)
    } catch (e) {
      setTwoMessage(e instanceof Error ? e.message : String(e))
    }
  }

  const put = () => {
    const values = [x, y, length, angle].map((v) => Number(v))
    if (values.some((v) => !Number.isFinite(v))) {
      setMessage('数字を入れてください')
      return
    }
    try {
      addNumericLine({ x: Math.round(values[0]!), y: Math.round(values[1]!) }, values[2]!, values[3]!)
      setMessage(null)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div>
      <label>
        始点 x (mm)
        <input type="number" value={x} onChange={(e) => setX(e.target.value)} />
      </label>
      <label>
        始点 y (mm)
        <input type="number" value={y} onChange={(e) => setY(e.target.value)} />
      </label>
      <label>
        長さ (mm)
        <input type="number" value={length} onChange={(e) => setLength(e.target.value)} />
      </label>
      <label>
        角度 (°、x の正の向きが 0・反時計回り)
        <input type="number" value={angle} onChange={(e) => setAngle(e.target.value)} />
      </label>
      <button type="button" onClick={put}>
        線を入れる
      </button>
      {message ? <p className="muted">{message}</p> : null}
      <p className="muted" style={{ marginTop: 8 }}>
        円弧（中心 → 始点 → 終点。中心と R の起点を先に置く。mm）
      </p>
      {ARC_CENTER_LABELS.map((label, i) => (
        <label key={label}>
          {label}
          <input
            type="number"
            value={arcText[i]}
            onChange={(e) => setArcText((prev) => prev.map((t, j) => (j === i ? e.target.value : t)))}
          />
        </label>
      ))}
      <button type="button" onClick={putArcCenter}>
        円弧を入れる（中心から）
      </button>
      {arcMessage ? <p className="muted">{arcMessage}</p> : null}
      <p className="muted" style={{ marginTop: 8 }}>
        円弧（二点。二点を結ぶ弦の垂直二等分線上に中心を置く。ずらしは mm）
      </p>
      {ARC_TWO_LABELS.map((label, i) => (
        <label key={label}>
          {label}
          <input
            type="number"
            value={twoText[i]}
            onChange={(e) => setTwoText((prev) => prev.map((t, j) => (j === i ? e.target.value : t)))}
          />
        </label>
      ))}
      <button type="button" onClick={putArcTwo}>
        円弧を入れる（二点から）
      </button>
      {twoMessage ? <p className="muted">{twoMessage}</p> : null}
    </div>
  )
}
