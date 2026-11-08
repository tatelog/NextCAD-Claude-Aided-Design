// 配置図と平面図の中身（統括の依頼 2026-11-06。1-c）。図枠の作図領域の中に、縦横比を保って収める（決定論）。
// 元のデータが無いときは図を作らない（null）。単位は mm。y は上向き（モデル）を、用紙の下向きに直す。
export interface Pt {
  x: number
  y: number
}

export interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface RectLike {
  id: string
  x0: number
  y0: number
  x1: number
  y1: number
}

/** 点群を作図領域に収める変換。倍率は一つだけ（縦横比を保つ）。中央に寄せる */
export function fitTransformOf(points: readonly Pt[], area: Box): (p: Pt) => Pt {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const w = Math.max(maxX - minX, 1)
  const h = Math.max(maxY - minY, 1)
  const aw = area.x1 - area.x0
  const ah = area.y1 - area.y0
  const s = Math.min(aw / w, ah / h)
  const ox = area.x0 + (aw - w * s) / 2
  const oy = area.y0 + (ah - h * s) / 2
  return (p) => ({ x: ox + (p.x - minX) * s, y: oy + (maxY - p.y) * s })
}

const pathOf = (pts: readonly Pt[], t: (p: Pt) => Pt): string =>
  'M' + pts.map((p) => {
    const q = t(p)
    return `${q.x.toFixed(2)} ${q.y.toFixed(2)}`
  }).join(' L') + ' Z'

/** 標準の縮尺（分母）。図枠の縮尺の候補（permitFrame.json）と合わせる */
export const STANDARD_SCALES: readonly number[] = [100, 200, 250, 300, 400, 500, 600, 1000, 1200, 1500, 2000]

/** 作図の領域に収まる、いちばん大きい（分母のいちばん小さい）標準の縮尺。どれも収まらなければ null */
export function chooseScaleOf(wMm: number, hMm: number, area: Box): number | null {
  const aw = area.x1 - area.x0
  const ah = area.y1 - area.y0
  for (const s of STANDARD_SCALES) {
    if (wMm / s <= aw && hMm / s <= ah) return s
  }
  return null
}

/** 縮尺 1/s で、点群を作図領域の中央に置く変換（y は上向きを下向きに直す） */
export function scaledTransformOf(points: readonly Pt[], area: Box, s: number): (p: Pt) => Pt {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const w = (maxX - minX) / s
  const h = (maxY - minY) / s
  const ox = area.x0 + (area.x1 - area.x0 - w) / 2
  const oy = area.y0 + (area.y1 - area.y0 - h) / 2
  return (p) => ({ x: ox + (p.x - minX) / s, y: oy + (maxY - p.y) / s })
}

/** 配置図の中身。確定した筆界（破線）・外形（塗り）・周辺建物（灰）を、作図領域に収める。筆界も外形も無ければ null */
export function siteLayoutBodyOf(input: {
  lot: readonly Pt[] | null
  footprint: readonly Pt[] | null
  neighbors: readonly (readonly Pt[])[]
  area: Box
  /** 縮尺の分母。省略すると、作図の領域に合わせて縮める */
  scale?: number
}): string | null {
  if (input.lot === null && input.footprint === null) return null
  const all: Pt[] = [...(input.lot ?? []), ...(input.footprint ?? []), ...input.neighbors.flatMap((n) => [...n])]
  if (all.length < 3) return null
  const t = input.scale === undefined ? fitTransformOf(all, input.area) : scaledTransformOf(all, input.area, input.scale)
  const parts: string[] = []
  for (const n of input.neighbors) {
    parts.push(`<path data-role="neighbor" d="${pathOf(n, t)}" fill="#e9e9e9" stroke="#888" stroke-width="0.25"/>`)
  }
  if (input.footprint !== null) {
    parts.push(`<path data-role="footprint" d="${pathOf(input.footprint, t)}" fill="#dde7f0" stroke="#1f2a44" stroke-width="0.35"/>`)
  }
  if (input.lot !== null) {
    parts.push(`<path data-role="lot" d="${pathOf(input.lot, t)}" fill="none" stroke="#000" stroke-width="0.5" stroke-dasharray="3 2"/>`)
  }
  return parts.join('')
}

/** 配置図に入れる周辺建物の範囲: 筆（と外形）の外接矩形から、each side この距離（mm）。一か所の定数（統括の依頼 2026-11-06。1） */
export const SITE_NEIGHBOR_MARGIN_MM = 40_000

/** 配置図が作れないときの理由（空欄の一覧・ビューアに出す） */
export const SITE_MISSING_TEXT = {
  notConfirmed: '敷地を確定すると出せます',
  noFit: '敷地が大きく、図枠に収まる縮尺が無い',
} as const

/** 配置図の作り方の結果。作れたら中身と分母、作れなければ理由 */
export type SiteLayoutState = { kind: 'ok'; body: string; denominator: number } | { kind: 'notConfirmed' } | { kind: 'noFit' }

/** 周辺建物を、基点（筆と外形の点）のまわり margin の範囲で切る。範囲の外だけの建物は入らない（範囲にかかる建物は、枠で切って入る） */
export function nearSiteNeighborsOf(
  base: readonly Pt[],
  neighbors: readonly (readonly Pt[])[],
  marginMm: number = SITE_NEIGHBOR_MARGIN_MM,
): Pt[][] {
  if (base.length === 0) return []
  const xs = base.map((p) => p.x)
  const ys = base.map((p) => p.y)
  const box = {
    x0: Math.min(...xs) - marginMm,
    x1: Math.max(...xs) + marginMm,
    y0: Math.min(...ys) - marginMm,
    y1: Math.max(...ys) + marginMm,
  }
  // 範囲にかかる建物は、範囲の枠で切って入れる（丸ごと外さない。統括の依頼 2026-11-06。小さな直し）
  return neighbors.map((n) => clipPolygonToBoxOf(n, box)).filter((n) => n.length >= 3)
}

/** 多角形を、軸に平行な矩形（作図の範囲）で切る（Sutherland–Hodgman）。範囲の外の部分は、枠の辺で切り取る。全部が外なら空 */
export function clipPolygonToBoxOf(polygon: readonly Pt[], box: { x0: number; y0: number; x1: number; y1: number }): Pt[] {
  type Edge = { inside: (p: Pt) => boolean; cut: (a: Pt, b: Pt) => Pt }
  const edges: Edge[] = [
    {
      inside: (p) => p.x >= box.x0,
      cut: (a, b) => ({ x: box.x0, y: a.y + ((box.x0 - a.x) / (b.x - a.x)) * (b.y - a.y) }),
    },
    {
      inside: (p) => p.x <= box.x1,
      cut: (a, b) => ({ x: box.x1, y: a.y + ((box.x1 - a.x) / (b.x - a.x)) * (b.y - a.y) }),
    },
    {
      inside: (p) => p.y >= box.y0,
      cut: (a, b) => ({ x: a.x + ((box.y0 - a.y) / (b.y - a.y)) * (b.x - a.x), y: box.y0 }),
    },
    {
      inside: (p) => p.y <= box.y1,
      cut: (a, b) => ({ x: a.x + ((box.y1 - a.y) / (b.y - a.y)) * (b.x - a.x), y: box.y1 }),
    },
  ]
  let out: Pt[] = [...polygon]
  for (const e of edges) {
    const cur = out
    out = []
    for (let i = 0; i < cur.length; i++) {
      const p = cur[i]!
      const q = cur[(i - 1 + cur.length) % cur.length]!
      const pIn = e.inside(p)
      const qIn = e.inside(q)
      if (pIn) {
        if (!qIn) out.push(e.cut(q, p))
        out.push(p)
      } else if (qIn) {
        out.push(e.cut(q, p))
      }
    }
    if (out.length === 0) return []
  }
  return out
}

/** 配置図を作る。縮尺は、筆と外形と、そのまわりの範囲の周辺建物で決める（収まるいちばん大きい標準の縮尺）。作れないときは理由を返す */
export function siteLayoutStateOf(input: {
  lot: readonly Pt[] | null
  footprint: readonly Pt[] | null
  neighbors: readonly (readonly Pt[])[]
  area: Box
}): SiteLayoutState {
  const base: Pt[] = [...(input.lot ?? []), ...(input.footprint ?? [])]
  if (base.length < 3) return { kind: 'notConfirmed' }
  const neighbors = nearSiteNeighborsOf(base, input.neighbors)
  const all: Pt[] = [...base, ...neighbors.flatMap((n) => [...n])]
  const xs = all.map((p) => p.x)
  const ys = all.map((p) => p.y)
  const s = chooseScaleOf(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), input.area)
  if (s === null) return { kind: 'noFit' }
  const body = siteLayoutBodyOf({ ...input, neighbors, scale: s })
  return body === null ? { kind: 'notConfirmed' } : { kind: 'ok', body, denominator: s }
}

/** 配置図が作れないときの理由。作れるときは null */
export function siteMissingTextOf(state: SiteLayoutState): string | null {
  return state.kind === 'ok' ? null : SITE_MISSING_TEXT[state.kind]
}

/** 配置図を、収まるいちばん大きい標準の縮尺で作る。分母も返す（図枠の縮尺の欄に書く）。作れなければ null */
export function siteLayoutOf(input: {
  lot: readonly Pt[] | null
  footprint: readonly Pt[] | null
  neighbors: readonly (readonly Pt[])[]
  area: Box
}): { body: string; denominator: number } | null {
  const r = siteLayoutStateOf(input)
  return r.kind === 'ok' ? { body: r.body, denominator: r.denominator } : null
}

/** 各階平面図を、収まるいちばん大きい標準の縮尺で作る。分母も返す。作れなければ null */
export function floorPlanOf(input: {
  widthMm: number
  depthMm: number
  gridLines: readonly number[]
  units: readonly RectLike[]
  area: Box
}): { body: string; denominator: number } | null {
  const s = chooseScaleOf(input.widthMm, input.depthMm, input.area)
  if (s === null) return null
  const body = floorPlanBodyOf({ ...input, scale: s })
  return body === null ? null : { body, denominator: s }
}

/** 各階平面図の中身（基準階 1 枚）。外形の枠・通り芯（横の線）・住戸の区画（矩形）。住戸が無ければ null */
export function floorPlanBodyOf(input: {
  widthMm: number
  depthMm: number
  gridLines: readonly number[]
  units: readonly RectLike[]
  area: Box
  /** 縮尺の分母。省略すると、作図の領域に合わせて縮める */
  scale?: number
}): string | null {
  if (input.units.length === 0) return null
  const corners: Pt[] = [
    { x: 0, y: 0 },
    { x: input.widthMm, y: 0 },
    { x: input.widthMm, y: input.depthMm },
    { x: 0, y: input.depthMm },
  ]
  const t = input.scale === undefined ? fitTransformOf(corners, input.area) : scaledTransformOf(corners, input.area, input.scale)
  const rect = (x0: number, y0: number, x1: number, y1: number) => {
    const a = t({ x: x0, y: y1 })
    const b = t({ x: x1, y: y0 })
    return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y }
  }
  const parts: string[] = []
  const o = rect(0, 0, input.widthMm, input.depthMm)
  parts.push(
    `<rect data-role="outline" x="${o.x.toFixed(2)}" y="${o.y.toFixed(2)}" width="${o.w.toFixed(2)}" height="${o.h.toFixed(2)}" fill="none" stroke="#000" stroke-width="0.5"/>`,
  )
  for (const g of input.gridLines) {
    const a = t({ x: 0, y: g })
    const b = t({ x: input.widthMm, y: g })
    parts.push(
      `<line data-role="grid" x1="${a.x.toFixed(2)}" y1="${a.y.toFixed(2)}" x2="${b.x.toFixed(2)}" y2="${b.y.toFixed(2)}" stroke="#555" stroke-width="0.2" stroke-dasharray="2 1"/>`,
    )
  }
  for (const u of input.units) {
    const r = rect(u.x0, u.y0, u.x1, u.y1)
    parts.push(
      `<rect data-role="unit" x="${r.x.toFixed(2)}" y="${r.y.toFixed(2)}" width="${r.w.toFixed(2)}" height="${r.h.toFixed(2)}" fill="none" stroke="#333" stroke-width="0.25"/>`,
    )
  }
  return parts.join('')
}
