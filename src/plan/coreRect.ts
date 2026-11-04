// EV コアの矩形の入力（D-04 P3 のコア、D-03 T-02 cores、A-03 G17）。
// 四隅がすべて空なら未入力。一部だけ入っていれば不正。矩形は mm の整数で、x1 > x0 かつ y1 > y0 のとき使う。
export interface CoreRectText {
  x0: string
  y0: string
  x1: string
  y1: string
}

export interface CoreRect {
  id: string
  x0: number
  y0: number
  x1: number
  y1: number
}

export function parseCoreRect(t: CoreRectText): { rect: CoreRect | null; error: string | null } {
  const fields = [t.x0, t.y0, t.x1, t.y1].map((v) => v.trim())
  if (fields.every((v) => v === '')) return { rect: null, error: null }
  if (fields.some((v) => v === '')) return { rect: null, error: 'コアは四隅すべてを入れる' }

  const x0 = Number(t.x0)
  const y0 = Number(t.y0)
  const x1 = Number(t.x1)
  const y1 = Number(t.y1)
  if (![x0, y0, x1, y1].every((n) => Number.isInteger(n))) {
    return { rect: null, error: 'コアの座標は整数（mm）で入れる' }
  }
  if (x1 <= x0 || y1 <= y0) return { rect: null, error: 'コアは x1 > x0 かつ y1 > y0' }
  return { rect: { id: 'ev-1', x0, y0, x1, y1 }, error: null }
}
