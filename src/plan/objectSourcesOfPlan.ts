// 左メニューの入力の組み立て（ハブ A-03 G55、D-04 共通部品「左メニュー」）。P2 の 2D 平面・P3・P4 で共通に使う。描画にも状態にも依存しない純粋な処理。
// 種類ごとの入力は ObjectDetailSources（objectMenu の件数と objectDetail の中身の、共通の入力）。件数・文言は仮置き。
import type { Point } from '../geom/viewport'
import type { AutoPlan } from './autoPlan'
import { candidateCells, type Rect } from './candidateCells'
import type { Fixture } from './fixtures'
import { gridLines } from './grid'
import type { ObjectDetailSources } from './objectDetail'
import { emptyObjectTableInput, type ObjectTableInput } from './objectTable'

const NOTICE_BEFORE_AUTO_PLAN = '自動作成の後に出ます'

// どの種類も空（件数は全部 0）
const emptySources = (): ObjectDetailSources => ({
  siteBoundaries: [],
  outlines: [],
  gridLines: [],
  cores: [],
  shafts: [],
  corridors: [],
  fixtures: [],
  units: [],
  rooms: [],
})

// P3 の画面（P3Plan）と同じ: 柱割りが決まらなければ通り芯は無し
function gridLinesOf(depthMm: number, spanMm: number): number[] {
  try {
    return gridLines(depthMm, spanMm)
  } catch {
    return []
  }
}

// 廊下は candidateCells が作る全廊下。結果（AutoPlan）に残るのは主の廊下 1 本だけなので、2 本あるツインだけ candidateCells から取り直す。
// 主の廊下が西の縁（x = 0）に接するのはツインだけ（片廊下は東の縁、中廊下・階段室は中央）。
function corridorsOf(plan: AutoPlan, spanMm: number): readonly Rect[] {
  const main = plan.corridor
  if (main.x0 !== 0) return [main]
  const corridorMm = main.x1 - main.x0
  try {
    return candidateCells({
      width_mm: plan.widthMm,
      depth_mm: plan.depthMm,
      corridor_mm: corridorMm,
      unit_depth_mm: plan.widthMm - 2 * corridorMm,
      span_mm: spanMm,
      layout: 'ツイン',
    }).corridors
  } catch {
    return [main]
  }
}

/**
 * P3 の自動作成の結果から、左メニューの入力を作る。P3 の画面が描くものと同じ規則:
 * 外形 = 原点から 幅 × 奥行 の矩形の 1 件 / 通り芯 = gridLines(奥行, スパン) / 廊下 = 全廊下 / 住戸 = 区画候補 / コア・縦シャフト・部屋 = 結果のまま。
 * 筆界は P1 の筆界が P3 にまだ入らないので 0 件（仮置き）。柱・壁・開口はデータが無いので入力に含めない。
 * 什器（G69） = 第 2 引数に渡された、P3 で置いた什器の一覧（店舗のもの。置いた順、区画なしも含む）。省略すると空。
 * 什器は自動作成の結果ではないので、結果が無くても、渡された什器はそのまま入れる（P4 の什器の欄と同じ値）。
 * 結果が無い（null・未指定）ときは、什器以外のどの種類も空。入力は書き換えない。
 */
export function objectSourcesOfPlan(plan: AutoPlan | null | undefined, fixtures: readonly Fixture[] = []): ObjectDetailSources {
  if (!plan) return { ...emptySources(), fixtures }
  // 奥行 = スパン数 × スパン（自動作成の決め方）。結果にスパンは残らないので割り戻す
  const spanMm = plan.depthMm / plan.spans
  return {
    siteBoundaries: [],
    outlines: [{ x0: 0, y0: 0, x1: plan.widthMm, y1: plan.depthMm }],
    gridLines: gridLinesOf(plan.depthMm, spanMm),
    cores: plan.cores,
    shafts: plan.shaftRects,
    corridors: corridorsOf(plan, spanMm),
    fixtures,
    units: plan.cells,
    rooms: plan.rooms,
  }
}

/**
 * P2 の 2D 平面で、左メニューの入力を作る。持っているのは外形（閉じた輪郭の頂点列）と仮の筆界（矩形）だけ。
 * 頂点が 3 つ以上なら外形 1 件（頂点の数ではなく輪郭の数）。閉じていない（null・未指定・3 つ未満）なら 0 件。
 * 筆界は渡されれば 1 件。中身は件数にしか使わない（筆界・外形の中身は未配線）。入力は書き換えない。
 * 什器は P3 の道具なので、P2 は渡さない（空）。
 */
export function objectSourcesOfFootprint(footprint?: readonly Point[] | null, parcel?: unknown): ObjectDetailSources {
  return {
    ...emptySources(),
    siteBoundaries: parcel === null || parcel === undefined ? [] : [parcel],
    outlines: footprint !== null && footprint !== undefined && footprint.length >= 3 ? [footprint] : [],
  }
}

/**
 * P3 の自動作成の結果から、オブジェクト表の入力を作る（G78。左の一覧の件数も、積算の表も、この入力から出す）。
 * 外形・通り芯・廊下（ツインは 2 本）・コア・縦シャフト・住戸・部屋は結果のまま。什器は渡されたものをそのまま（結果が無くても入る）。
 * 結果が無い（null・未指定）ときは、什器だけが入る。
 */
export function tableInputOfPlan(plan: AutoPlan | null | undefined, fixtures: readonly Fixture[] = []): ObjectTableInput {
  if (!plan) return { ...emptyObjectTableInput(), fixtures }
  const spanMm = plan.depthMm / plan.spans
  return {
    cells: plan.cells,
    rooms: plan.rooms,
    shafts: plan.shaftRects,
    cores: plan.cores,
    corridors: corridorsOf(plan, spanMm),
    outline: [
      { x: 0, y: 0 },
      { x: plan.widthMm, y: 0 },
      { x: plan.widthMm, y: plan.depthMm },
      { x: 0, y: plan.depthMm },
    ],
    siteBoundary: false,
    gridLines: gridLinesOf(plan.depthMm, spanMm),
    fixtures,
  }
}

/** 自動作成の前（結果が無い）ときだけ、左メニューに出す注記。結果があれば undefined。 */
export function noticeOfPlan(plan: AutoPlan | null | undefined): string | undefined {
  return plan ? undefined : NOTICE_BEFORE_AUTO_PLAN
}
