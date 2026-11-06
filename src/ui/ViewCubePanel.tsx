// ビューキューブ（代表の依頼 2026-11-06。3）。3D の右上に出す。六面（上・下・正面・背面・左・右）・十二辺・八隅のうち、カメラに向いているものを描き、押すと、その向きから見る。
// キューブはカメラの向きに合わせて回る（cubeViewOf）。文字（面の見出し）が入るので、枠は付ける（代表の決まり 2026-11-06: 文字が入るものは枠あり）。
import type { KeyboardEvent } from 'react'
import { CUBE_TARGETS, cubeViewOf, type CubeKind, type CubeTarget, type Dir } from './viewCube'

const SIZE = 92
const CENTER = SIZE / 2
/** 単位立方体の一辺の半分（px） */
const HALF = 28

export interface ViewCubeProps {
  /** 注視点からカメラへの向き（単位長さ） */
  toCamera: Dir
  /** 押した向き（面・辺・隅のどれか） */
  onPick: (target: CubeTarget) => void
}

function targetOf(kind: CubeKind, id: string): CubeTarget {
  const t = CUBE_TARGETS.find((c) => c.kind === kind && c.id === id)
  if (!t) throw new Error(`view cube target not found: ${kind} ${id}`)
  return t
}

// 押す（クリック・Enter・Space）を一つにまとめる
function pressProps(onPress: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: onPress,
    onKeyDown: (e: KeyboardEvent<SVGElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onPress()
      }
    },
    style: { cursor: 'pointer' },
  }
}

export function ViewCube({ toCamera, onPick }: ViewCubeProps) {
  const view = cubeViewOf(toCamera)
  const px = ([x, y]: [number, number]): [number, number] => [CENTER + x * HALF, CENTER - y * HALF]
  const pick = (kind: CubeKind, id: string) => onPick(targetOf(kind, id))
  return (
    <div style={{ border: '1px solid #b8b2a4', borderRadius: 6, background: '#fff', lineHeight: 0 }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-label="ビューキューブ" role="group">
        {view.faces
          .filter((f) => f.visible)
          .map((f) => (
            <g key={f.id} aria-label={f.label} {...pressProps(() => pick('face', f.id))}>
              <polygon points={f.points.map(px).map((p) => p.join(',')).join(' ')} fill="#f4f1ea" stroke="#8a8477" strokeWidth={1} />
              <text x={px(f.center)[0]} y={px(f.center)[1]} textAnchor="middle" dominantBaseline="central" fontSize={11} fill="#1f2a44" style={{ pointerEvents: 'none' }}>
                {f.label}
              </text>
            </g>
          ))}
        {view.edges
          .filter((e) => e.visible)
          .map((e) => {
            const [x1, y1] = px(e.from)
            const [x2, y2] = px(e.to)
            return (
              <g key={e.id} aria-label="辺" {...pressProps(() => pick('edge', e.id))}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#8a8477" strokeWidth={1.2} />
                {/* 押しやすいように、太い透明の線を重ねる */}
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={10} />
              </g>
            )
          })}
        {view.corners
          .filter((c) => c.visible)
          .map((c) => {
            const [x, y] = px(c.at)
            return (
              <g key={c.id} aria-label="隅" {...pressProps(() => pick('corner', c.id))}>
                <circle cx={x} cy={y} r={4} fill="#8a8477" />
                <circle cx={x} cy={y} r={7} fill="transparent" />
              </g>
            )
          })}
      </svg>
    </div>
  )
}
