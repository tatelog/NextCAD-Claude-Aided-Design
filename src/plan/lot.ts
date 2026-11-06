// P2 が使う敷地（筆界）の判定。地図で選んだ筆があればその平面、無ければダミー（20 m × 30 m）。
// 決定論。画面の値（選んだ筆の平面）は呼び出し側が渡す。統括の依頼 2026-11-06（P2 の斜線の基準を P1 の筆に替える）。
import type { Point } from '../geom/viewport'
import { polygonAreaMm2 } from '../geom/polygon'
import { isAxisRectangle } from '../volume/placement'
import { DUMMY_PARCEL } from './dummyParcel'
import { outwardNormal } from '../law/frontRoad'

/** P2 の敷地。選んだ筆（P1 の公図の平面）があればそれ、無ければダミー */
export function lotOf(parcel: Point[] | null): Point[] {
  return parcel ?? DUMMY_PARCEL
}

/** 前面道路の辺の選択肢（0 始まりの番号。敷地の辺の数ぶん） */
export function roadEdgeOptionsOf(lot: readonly Point[]): number[] {
  return lot.map((_, i) => i)
}

/** 前面道路の辺の番号を、敷地の辺の範囲に収める。超えたら最後の辺、負や数でない値は 0 */
export function roadEdgeIndexOf(lot: readonly Point[], requested: number): number {
  if (lot.length === 0 || !Number.isFinite(requested)) return 0
  return Math.min(lot.length - 1, Math.max(0, Math.floor(requested)))
}

/** 筆界の注記（選んだ筆か、ダミーか） */
export function lotNoteOf(parcel: Point[] | null): string {
  return parcel === null ? '筆界はダミー（20 m × 30 m）' : '筆界は選んだ筆（敷地で選んだ公図）'
}

/**
 * 斜線の注記の文（統括の依頼 2026-11-06）。いま使っている敷地と同じ元から作る:
 * 選んだ筆（parcel）が無ければダミーの筆界、あれば選んだ筆と地番（chiban。取れなければ「地番不明」）。
 */
export function slopeLotNoteOf(parcel: Point[] | null, chiban: string | null): string {
  const lot = parcel === null ? '筆界（ダミー 20 m × 30 m）' : `選んだ筆（${chiban === null ? '地番不明' : `地番 ${chiban}`}）`
  return `斜線は法定の値（建築基準法 第56条・別表第三）を${lot}に当てて切る。`
}

/** 筆界の一つの辺の番号（2D の平面に出す。統括の決定 2026-11-06）。mid は辺の中点、outward は外向きの単位ベクトル、selected は前面道路に選んでいる辺 */
export interface LotEdgeLabel {
  index: number
  mid: Point
  outward: { x: number; y: number }
  selected: boolean
}

/** 筆界の辺の番号（0〜n−1）。辺 i は頂点 i → i+1。外向きは辺の向きによらず筆界の外へ向く */
export function lotEdgeLabelsOf(lot: readonly Point[], roadEdgeIndex: number): LotEdgeLabel[] {
  return lot.map((a, i) => {
    const b = lot[(i + 1) % lot.length]!
    return {
      index: i,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      outward: outwardNormal(lot, i),
      selected: i === roadEdgeIndex,
    }
  })
}

/** 離れの注記。敷地が軸に平行な矩形のときは出さない。矩形でなければ「離れは矩形の敷地だけ」 */
export function setbackNoteOf(lot: readonly Point[]): string | null {
  return isAxisRectangle(lot) ? null : '離れは矩形の敷地だけ'
}

/** 敷地の面積（mm²）。多角形の実際の面積 */
export function lotAreaMm2(lot: readonly Point[]): number {
  return polygonAreaMm2(lot)
}

/** 敷地の中心（外接矩形の中心。mm の整数に丸める）。周辺建物の基準点を置く位置 */
export function lotCenterOf(lot: readonly Point[]): Point {
  const xs = lot.map((p) => p.x)
  const ys = lot.map((p) => p.y)
  return {
    x: Math.round((Math.min(...xs) + Math.max(...xs)) / 2),
    y: Math.round((Math.min(...ys) + Math.max(...ys)) / 2),
  }
}

/** P1 の「前面道路の幅員」の下の注記（統括の依頼 2026-11-06。7）。選んだ筆があるときは、その筆の注記。筆が無いときだけ、ダミーの仮置きの文言 */
export function parcelNoticeOf(parcel: Point[] | null): string {
  return parcel === null
    ? '仮置き: 筆界はダミー（20 m × 30 m）。登記情報は使わない（約款未確認）。'
    : '筆界は選んだ筆（敷地で選んだ公図）。登記情報は使わない（約款未確認）'
}
