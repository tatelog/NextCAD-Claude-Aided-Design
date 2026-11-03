// 数値入力（ハブ D-04 共通部品「数値入力」。置くかどうかは未決。仮置き）。P2 の右パネルで、始点・長さ・角度を数字で入れて線を一本入れる。
// 入力の確かめと線の作成は numericLine.ts に任せる。ここは入力欄と案内だけ。
import { useState } from 'react'
import { addArcStroke, addNumericLine } from '../input/numericLine'

// 円弧（3 点。始点・通過点・終点、mm）の入力欄の並び（仮置き）
const ARC_LABELS = ['始点 x', '始点 y', '通過点 x', '通過点 y', '終点 x', '終点 y'] as const

export function NumericLineForm() {
  const [x, setX] = useState('0')
  const [y, setY] = useState('0')
  const [length, setLength] = useState('1000')
  const [angle, setAngle] = useState('0')
  const [message, setMessage] = useState<string | null>(null)
  // 円弧（3 点）。既定は (0,0)・(500,1000)・(1000,0) の上半分の弧（仮置き）
  const [arcText, setArcText] = useState<string[]>(['0', '0', '500', '1000', '1000', '0'])
  const [arcMessage, setArcMessage] = useState<string | null>(null)

  const putArc = () => {
    const values = arcText.map((v) => Number(v))
    if (values.some((v) => !Number.isFinite(v))) {
      setArcMessage('数字を入れてください')
      return
    }
    const r = (n: number) => Math.round(n)
    try {
      addArcStroke({ x: r(values[0]!), y: r(values[1]!) }, { x: r(values[2]!), y: r(values[3]!) }, { x: r(values[4]!), y: r(values[5]!) })
      setArcMessage(null)
    } catch (e) {
      setArcMessage(e instanceof Error ? e.message : String(e))
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
        円弧（3 点。始点・通過点・終点、mm）
      </p>
      {ARC_LABELS.map((label, i) => (
        <label key={label}>
          {label}
          <input
            type="number"
            value={arcText[i]}
            onChange={(e) => setArcText((prev) => prev.map((t, j) => (j === i ? e.target.value : t)))}
          />
        </label>
      ))}
      <button type="button" onClick={putArc}>
        円弧を入れる
      </button>
      {arcMessage ? <p className="muted">{arcMessage}</p> : null}
    </div>
  )
}
