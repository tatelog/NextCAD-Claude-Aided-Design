// P3 の幅と奥行きを、P2 で描いた外形（閉じた輪郭）から取る（D-04 P3。仮置き）。
// 取れるのは矩形の外形だけ。矩形でなければ null を返し、呼び出し側が「手で入れてください」と案内する。
// 外形の左下（最小の x と y）は、P3 の平面を外形の位置に重ねる原点として返しておく（今回は使わない。3D の対応の準備）。
import type { Point } from '../geom/viewport'

export interface OutlineDimensions {
  /** x の最大 − 最小（四捨五入した整数 mm） */
  widthMm: number
  /** y の最大 − 最小（四捨五入した整数 mm） */
  depthMm: number
  /** 外形の左下の x（最小の x）。丸めずに返す */
  minX: number
  /** 外形の左下の y（最小の y）。丸めずに返す */
  minY: number
}

/**
 * 辺の向き。水平（x の変化に対して y の変化が tan 以下）か垂直（その逆）。長さ 0 の辺と、どちらにも当たらない斜めの辺は null。
 * tan は許容する傾きの tan。許容差 0 度なら 0 で、完全に平行な辺だけが水平・垂直になる。
 */
function edgeKind(a: Point, b: Point, tan: number): 'h' | 'v' | null {
  const dx = Math.abs(b.x - a.x)
  const dy = Math.abs(b.y - a.y)
  if (dx !== 0 && dy <= dx * tan) return 'h'
  if (dy !== 0 && dx <= dy * tan) return 'v'
  return null
}

/**
 * 外形（頂点を順にたどった点の列）が矩形なら、幅・奥行き・左下を返す。矩形でなければ null。
 * 矩形: どの辺も x 軸か y 軸に平行で、角（入ってくる辺と出ていく辺の向きが変わる頂点）が 4 つ。
 * 最後が最初と同じ重複の点は、閉じるためのものとして外す。辺の途中の頂点（同じ向きの辺が続く所）は角に数えない
 * （手描きの線は、簡略化で辺の途中に頂点が残ることがある）。
 * 幅・奥行きは 4 つの角の x・y の最大 − 最小（四捨五入した整数 mm）。左下は角の最小の x・y。
 * 長さ 0 の辺がある形や、行って戻るだけで幅か奥行きが 0 になる形は、矩形にしない。
 *
 * axisToleranceDeg は、軸に平行とみなす傾き（度）。既定の 0 は完全に平行な辺だけ。
 * 手で閉じた外形の最後の辺は、端点への吸着（軸への吸着より先）で少し斜めに残るので、呼び出し側は P2 が軸に揃える角度を渡す。
 * 0 度以上 45 度未満でなければ RangeError。
 */
export function outlineDimensions(footprint: readonly Point[], axisToleranceDeg = 0): OutlineDimensions | null {
  if (!(axisToleranceDeg >= 0 && axisToleranceDeg < 45)) {
    throw new RangeError(`許容差は 0 度以上 45 度未満: ${axisToleranceDeg}`)
  }
  const tan = Math.tan((axisToleranceDeg * Math.PI) / 180)

  // 最後の点が最初の点と同じなら、閉じるための重複として外す
  const count = footprint.length
  const closesWithDuplicate = count > 1 && footprint[0]!.x === footprint[count - 1]!.x && footprint[0]!.y === footprint[count - 1]!.y
  const pts = closesWithDuplicate ? footprint.slice(0, -1) : footprint
  const n = pts.length
  if (n < 4) return null

  // 辺ごとの向き。斜めの辺や長さ 0 の辺があれば矩形ではない
  const kinds = pts.map((q, i) => edgeKind(q, pts[(i + 1) % n]!, tan))
  if (kinds.some((k) => k === null)) return null

  // 角 = 入ってくる辺と出ていく辺の向きが変わる頂点。角が 4 つなら、水平と垂直が交互に並ぶ矩形
  const corners = pts.filter((_, i) => kinds[(i + n - 1) % n] !== kinds[i])
  if (corners.length !== 4) return null

  const xs = corners.map((q) => q.x)
  const ys = corners.map((q) => q.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const widthMm = Math.round(Math.max(...xs) - minX)
  const depthMm = Math.round(Math.max(...ys) - minY)
  if (widthMm < 1 || depthMm < 1) return null
  // `+ 0` は -0 を 0 に揃える（整数 mm に -0 は要らない）
  return { widthMm, depthMm, minX: minX + 0, minY: minY + 0 }
}
