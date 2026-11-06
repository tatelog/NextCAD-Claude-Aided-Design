// 面・辺・隅の選択範囲を細いワイヤーで区切るビューキューブ。
import type { KeyboardEvent } from 'react'
import { CUBE_TARGETS, cubeViewOf, type CubeKind, type CubeTarget, type Dir } from './viewCube'

const SIZE = 92
const CENTER = SIZE / 2
const HALF = 28

export interface ViewCubeProps {
  toCamera: Dir
  onPick: (target: CubeTarget) => void
}

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
  const cuts = [0, 0.2, 0.8, 1]
  return (
    <div style={{ border: '1px solid #cbd0d8', borderRadius: 6, background: '#fff', lineHeight: 0 }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-label="ビューキューブ" role="group">
        <style>{`.view-cube-zone:hover,.view-cube-zone:focus{fill:#dce6f3;stroke:#566c8c;outline:none}`}</style>
        {view.faces.filter((f) => f.visible).map((f) => {
          const [a, b, c, d] = f.points as [[number, number], [number, number], [number, number], [number, number]]
          const at = (u: number, v: number): [number, number] => [
            a[0]*(1-u)*(1-v)+b[0]*u*(1-v)+c[0]*u*v+d[0]*(1-u)*v,
            a[1]*(1-u)*(1-v)+b[1]*u*(1-v)+c[1]*u*v+d[1]*(1-u)*v,
          ]
          return <g key={f.id}>
            {[0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => {
              const kind: CubeKind = row === 1 && col === 1 ? 'face' : row !== 1 && col !== 1 ? 'corner' : 'edge'
              const anchor = at(col / 2, row / 2)
              const candidates = kind === 'corner'
                ? view.corners.filter((t) => t.id.split('-').includes(f.id)).map((t) => ({ id: t.id, at: t.at }))
                : view.edges.filter((t) => t.id.split('-').includes(f.id)).map((t) => ({ id: t.id, at: [(t.from[0]+t.to[0])/2, (t.from[1]+t.to[1])/2] }))
              const nearest = candidates.sort((l, r) => Math.hypot(l.at[0]!-anchor[0], l.at[1]!-anchor[1])-Math.hypot(r.at[0]!-anchor[0], r.at[1]!-anchor[1]))[0]
              const id = kind === 'face' ? f.id : nearest!.id
              const target = CUBE_TARGETS.find((t) => t.kind === kind && t.id === id)!
              const points = [at(cuts[col]!, cuts[row]!), at(cuts[col+1]!, cuts[row]!), at(cuts[col+1]!, cuts[row+1]!), at(cuts[col]!, cuts[row+1]!) ]
              return <polygon key={`${row}-${col}`} className="view-cube-zone"
                aria-label={kind === 'face' ? f.label : `${kind === 'edge' ? '辺' : '隅'} ${id}`}
                {...pressProps(() => onPick(target))}
                points={points.map(px).map((p) => p.join(',')).join(' ')}
                fill={kind === 'face' ? '#f8fafc' : '#eef2f6'} stroke="#9aa6b5" strokeWidth={0.65} strokeLinejoin="round" />
            }))}
            <text x={px(f.center)[0]} y={px(f.center)[1]} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="#344158" style={{ pointerEvents: 'none' }}>{f.label}</text>
          </g>
        })}
      </svg>
    </div>
  )
}
