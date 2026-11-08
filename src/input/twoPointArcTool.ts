// 二点の円弧の道具（ハブ A-03 G130・t70。設計グリル・統括の 2026-11-05 の仕様）。
// 操作: (1) 一点目を押す。(2) 二点目を押す（一点目と同じ場所は不可）。(3) 二点の中点を通る中心線（垂直二等分線）上を動かして中心を決め、押して確定する。
// 半径は中心の位置から決まる（半径の数値入力ではない）。中心は、動かしたポインターを中心線に垂直に投影した位置。
// 状態の動きだけを決定論の関数にする。画面（DrawingCanvas）が、押した点（mm）と動かした点（mm）を渡す。
import { arcFromTwoPoints, type ArcPoint, type ArcResult } from './arc'

export type ArcToolState =
  | { phase: 'first' }
  | { phase: 'second'; p1: ArcPoint }
  | { phase: 'center'; p1: ArcPoint; p2: ArcPoint; offsetMm: number }

export type ArcToolAction = { type: 'click'; point: ArcPoint } | { type: 'move'; point: ArcPoint }

export interface ArcToolStep {
  state: ArcToolState
  /** 中心を決めて押したときの円弧。それ以外は null */
  commit: ArcResult | null
  /** 押せなかった理由（例: 二点目が一点目と同じ場所）。無ければ null */
  error: string | null
}

export const ARC_TOOL_START: ArcToolState = { phase: 'first' }

/** 二点が同じ場所か（0.5 mm 未満の差は同じとみなす） */
function samePoint(a: ArcPoint, b: ArcPoint): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < 0.5
}

/**
 * ポインターの位置の、中心線上のずらし量（mm）。二点の中点から、弦の左の法線方向への距離（正は左）。
 * 中心線に平行な成分（弦の方向の位置）は見ない。二点が同じなら RangeError。
 */
export function offsetOnBisector(p1: ArcPoint, p2: ArcPoint, pointer: ArcPoint): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const chord = Math.hypot(dx, dy)
  if (!(chord > 0)) throw new RangeError('二点が同じで、中心線が無い')
  const nx = -dy / chord
  const ny = dx / chord
  const mx = (p1.x + p2.x) / 2
  const my = (p1.y + p2.y) / 2
  return (pointer.x - mx) * nx + (pointer.y - my) * ny
}

/**
 * 道具の途中の形（mm の点列。画面への変換は呼び出し側）。一点目の前は null。
 * 二点目の前は、一点目から今のポインタ（hover）までの弦。中心を決める途中は、今のずらし量の円弧の点列（両端は二点）。
 */
export function arcPreviewMm(state: ArcToolState, hover: ArcPoint): ArcPoint[] | null {
  if (state.phase === 'first') return null
  if (state.phase === 'second') return [state.p1, hover]
  return arcFromTwoPoints(state.p1, state.p2, state.offsetMm).points
}

/** 道具の一歩。押す・動かすで、状態を進める。中心を決めて押したら、円弧を返して一点目の待ちに戻る */
export function arcToolStep(state: ArcToolState, action: ArcToolAction): ArcToolStep {
  switch (state.phase) {
    case 'first':
      if (action.type === 'click') return { state: { phase: 'second', p1: action.point }, commit: null, error: null }
      return { state, commit: null, error: null }
    case 'second':
      if (action.type === 'move') return { state, commit: null, error: null }
      if (samePoint(action.point, state.p1)) return { state, commit: null, error: '二点目は一点目と違う場所を押す' }
      return { state: { phase: 'center', p1: state.p1, p2: action.point, offsetMm: 0 }, commit: null, error: null }
    case 'center': {
      const offsetMm = offsetOnBisector(state.p1, state.p2, action.point)
      if (action.type === 'move') return { state: { ...state, offsetMm }, commit: null, error: null }
      return { state: ARC_TOOL_START, commit: arcFromTwoPoints(state.p1, state.p2, offsetMm), error: null }
    }
  }
}
