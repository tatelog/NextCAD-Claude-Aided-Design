// 入力の振り分けと、パン・ズームの計算（D-02 C1「入力の取り方」「ジェスチャの割り当て」）。
// 指・マウス・ペンは Pointer Events で一つに扱い、種類（pointerType）では分岐しない（G23）。
// 分岐は「ポインタの本数」と「マウスの中ボタン・Shift」だけ。
import { panBy, zoomAt, type Point, type Viewport } from '../geom/viewport'

/** none は何もしない（マウスの右ボタン。右クリックはサークルメニューに使う） */
export type PointerIntent = 'draw' | 'pan' | 'pan-zoom' | 'none'

export interface PointerDown {
  pointerType: string
  button: number
  /** 仕様のパンは中ボタンだけ。Shift は見ない（引数は呼び出し側の互換のため残す） */
  shiftKey: boolean
  /** この操作を含めて、今押さえているポインタの本数 */
  activeCount: number
}

/** 押した時点で、そのポインタが描くのか、パン・ズームに使うのかを決める */
export function classifyPointerDown(e: PointerDown): PointerIntent {
  if (e.pointerType === 'mouse' && e.button === 2) return 'none'
  if (e.activeCount >= 2) return 'pan-zoom'
  // マウスの中ボタンのドラッグはパン（指・ペンには効かせない）
  if (e.pointerType === 'mouse' && e.button === 1) return 'pan'
  return 'draw'
}

export interface PinchStep {
  /** 2 本の真ん中の移動量（px） */
  panPx: Point
  /** 指の距離の比（今 / 前）。距離が 0 のときは 1 */
  zoomFactor: number
  /** ズームの中心（今の真ん中・px） */
  anchorPx: Point
}

const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)

export function pinchStep(prev: readonly [Point, Point], next: readonly [Point, Point]): PinchStep {
  const prevMid = midpoint(prev[0], prev[1])
  const nowMid = midpoint(next[0], next[1])
  const prevDist = distance(prev[0], prev[1])
  const nowDist = distance(next[0], next[1])
  return {
    panPx: { x: nowMid.x - prevMid.x, y: nowMid.y - prevMid.y },
    zoomFactor: prevDist > 0 && nowDist > 0 ? nowDist / prevDist : 1,
    anchorPx: nowMid,
  }
}

/** 先にパン、次に真ん中を中心にズーム。前の真ん中の下にあった mm の点は、今の真ん中に来る */
export function applyPinch(vp: Viewport, step: PinchStep): Viewport {
  const panned = panBy(vp, step.panPx)
  return step.zoomFactor === 1 ? panned : zoomAt(panned, step.zoomFactor, step.anchorPx)
}

/** ホイールの量から倍率。上（負）で拡大。0 なら 1 */
export function wheelZoomFactor(deltaY: number): number {
  return Math.exp(-deltaY * 0.0015)
}
