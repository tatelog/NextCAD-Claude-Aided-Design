// 全体図（モックの右下の縮図）。描く物の全体と、いまの表示の範囲を小さく出す（枠が表示の範囲）。
import type { Bounds } from './mapBounds'

export function MiniMap({ bounds, polygons, frame, site, shadows = [], yUp = false }: { bounds: Bounds; yUp?: boolean; polygons: { x: number; y: number }[][]; shadows?: { x: number; y: number }[][]; frame?: Bounds; site?: readonly { x: number; y: number }[] }) {
  const w = bounds.x1 - bounds.x0
  const h = bounds.y1 - bounds.y0
  const pad = Math.max(w, h) * 0.05
  return (
    <div
      title="全体図（枠が今の表示の範囲）"
      style={{ position: 'absolute', right: 12, bottom: 12, width: 150, height: 120, background: 'rgba(255,255,255,0.92)', border: '1px solid #ddd8cc', borderRadius: 4, pointerEvents: 'none' }}
    >
      <span style={{ position: 'absolute', left: 6, top: 2, fontSize: 10, color: '#666' }}>全体図{shadows.length > 0 ? '・指定時期8–16時' : ''}</span>
      <svg
        width="100%"
        height="100%"
        viewBox={`${bounds.x0 - pad} ${(yUp ? -bounds.y1 : bounds.y0) - pad} ${w + 2 * pad} ${h + 2 * pad}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <g transform={yUp ? "scale(1,-1)" : undefined}>
        {site ? <polygon points={site.map((p) => `${p.x},${p.y}`).join(' ')} fill="#f1eee4" stroke="#8a8068" strokeWidth={Math.max(w, h) * 0.012} /> : null}
        <g fill="#52647b" fillOpacity={0.08}>
          {shadows.map((poly, i) => <polygon key={i} points={poly.map(p => `${p.x},${p.y}`).join(' ')} />)}
        </g>
        {polygons.map((poly, i) => (
          <polygon key={i} points={poly.map((p) => `${p.x},${p.y}`).join(' ')} fill="#e6e3dc" stroke="#1f2a44" strokeWidth={Math.max(w, h) * 0.01} />
        ))}
        {frame ? (
          <rect x={frame.x0} y={frame.y0} width={frame.x1 - frame.x0} height={frame.y1 - frame.y0} fill="none" stroke="#c44" strokeWidth={Math.max(w, h) * 0.012} />
        ) : null}
        </g>
      </svg>
    </div>
  )
}
