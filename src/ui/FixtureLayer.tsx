// 什器の層（ハブ A-03 G69、D-04 P3）。P3 の平面（SVG。座標は mm）に重ねる。状態は持たない。
// 品目を選んでいるとき、区画ごとに押せる四角を出す。押すと、その区画の id を渡す（置くのは呼び出し側）。
// 置いた什器は、品目の名前を、その区画の中央に出す（仮置き）。同じ区画に複数あるときは、中央を挟んで縦に並べる。
// 置いた什器の文字は、外すための印でもある（仮置き）。品目を選んでいないときは押せて、押すと、その什器の id を渡す（外すのは呼び出し側）。
// 品目を選んでいる間は、印の上を押しても区画に届き、続けて置けるよう、印は押せない。
// 区画の指定が無い什器と、区画の一覧に無い区画の什器は、図に出さない（置く場所が無いだけで、一覧には残る）。
import type { Rect } from '../plan/candidateCells'
import { fixtureLabel, type Fixture } from '../plan/fixtures'

// 平面の座標は mm なので、文字の大きさと行の間隔も mm（寸法線の文字は 300）
const FONT_MM = 320
const LINE_MM = 420

export interface FixtureLayerProps {
  /** 区画の候補（mm） */
  cells: readonly Rect[]
  /** 置いた什器 */
  fixtures: readonly Fixture[]
  /** 品目を選んでいるとき true。区画を押すと onTap が呼ばれる */
  active: boolean
  /** 押した区画の id を渡す */
  onTap: (unitId: string) => void
  /** 押した印の什器の id を渡す（品目を選んでいないときだけ押せる）。外すのは呼び出し側 */
  onRemove: (id: string) => void
}

export function FixtureLayer({ cells, fixtures, active, onTap, onRemove }: FixtureLayerProps) {
  // 印を押せるのは、品目を選んでいないとき（選んでいる間は、印の上を押しても区画に届く）
  const pressable = !active
  return (
    <g>
      {cells.map((c) => {
        const here = fixtures.filter((f) => f.unitId === c.id)
        const cx = (c.x0 + c.x1) / 2
        const cy = (c.y0 + c.y1) / 2
        return (
          <g key={c.id}>
            {active ? (
              <rect
                data-unit={c.id}
                x={c.x0}
                y={c.y0}
                width={c.x1 - c.x0}
                height={c.y1 - c.y0}
                fill="transparent"
                role="button"
                aria-label={`区画 ${c.id} に置く`}
                style={{ cursor: 'pointer', touchAction: 'manipulation' }}
                onClick={() => onTap(c.id)}
              />
            ) : null}
            {here.map((f, i) => (
              <text
                key={f.id}
                x={cx}
                y={cy + (i - (here.length - 1) / 2) * LINE_MM}
                data-fixture={f.id}
                fontSize={FONT_MM}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#8a3b12"
                stroke="#fff"
                strokeWidth={60}
                strokeLinejoin="round"
                paintOrder="stroke"
                pointerEvents={pressable ? 'auto' : 'none'}
                role={pressable ? 'button' : undefined}
                aria-label={pressable ? `${fixtureLabel(f.item)}を外す` : undefined}
                style={pressable ? { cursor: 'pointer', touchAction: 'manipulation' } : undefined}
                onClick={pressable ? () => onRemove(f.id) : undefined}
              >
                {fixtureLabel(f.item)}
              </text>
            ))}
          </g>
        )
      })}
    </g>
  )
}
