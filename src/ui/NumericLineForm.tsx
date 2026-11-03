// 数値入力（ハブ D-04 共通部品「数値入力」。置くかどうかは未決。仮置き）。P2 の右パネルで、始点・長さ・角度を数字で入れて線を一本入れる。
// 入力の確かめと線の作成は numericLine.ts に任せる。ここは入力欄と案内だけ。
import { useState } from 'react'
import { addNumericLine } from '../input/numericLine'

export function NumericLineForm() {
  const [x, setX] = useState('0')
  const [y, setY] = useState('0')
  const [length, setLength] = useState('1000')
  const [angle, setAngle] = useState('0')
  const [message, setMessage] = useState<string | null>(null)

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
    </div>
  )
}
