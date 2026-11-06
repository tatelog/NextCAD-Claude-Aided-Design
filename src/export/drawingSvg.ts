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

/** 配置図を、収まるいちばん大きい標準の縮尺で作る。分母も返す（図枠の縮尺の欄に書く）。作れなければ null */
export function siteLayoutOf(input: {
  lot: readonly Pt[] | null
  footprint: readonly Pt[] | null
  neighbors: readonly (readonly Pt[])[]
  area: Box
}): { body: string; denominator: number } | null {
  const all: Pt[] = [...(input.lot ?? []), ...(input.footprint ?? []), ...input.neighbors.flatMap((n) => [...n])]
  if (all.length < 3) return null
  const xs = all.map((p) => p.x)
  const ys = all.map((p) => p.y)
  const s = chooseScaleOf(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), input.area)
  if (s === null) return null
  const body = siteLayoutBodyOf({ ...input, scale: s })
  return body === null ? null : { body, denominator: s }
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
