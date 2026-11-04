// 見積の明細（ハブ A-03 G86・D-03 T-04 の見積の行）。オブジェクト 1 件を、品目・数量・単位・単価の参照に分ける。決定論。
// 単価の参照（unitPriceRef）は、単価の表（T-10）が決まるまで null。明細の列名は仮（統括が T-04 を作り直すときに合わせる）。
import type { Quantity } from './quantities'
import { SLAB_THICKNESS_MM } from './structureQuantities'
import type { RebarCondition } from './rebarCondition'

export interface DetailLine {
  /** 行の id（オブジェクト id と品目の区分から決まる） */
  lineId: string
  /** 元になったオブジェクトの id */
  objectId: string
  category: Quantity['category']
  /** 品目 */
  item: string
  quantity: number
  unit: Quantity['unit']
  /** 単価の表（T-10）の参照。未決の間は null */
  unitPriceRef: string | null
  /** 仮置きの印（出典が無い値を含む） */
  provisional: boolean
  /** 数量の基礎になった条件（人が読めるように） */
  basis: string
  /** 出典の欄（G22）。仮置きは出典なし、鉄筋の係数は未確定（G22） */
  source: string
}

/** 明細の出典の欄（G22）。鉄筋の係数は、公的な出典が無いので「未確定（G22）」。ほかの仮置きは「出典なし・仮置き」。仮置きでない数量は「計算」 */
export function sourceOf(item: string, provisional: boolean): string {
  if (item.startsWith('鉄筋')) return '未確定（G22）: 出典なし・仮置き'
  return provisional ? '出典なし・仮置き（G22）' : '計算（仮置きなし）'
}

/** 躯体のオブジェクト 1 件（床版）を、見積の明細の行に分ける */
export function detailLinesOfStructure(
  objectId: string,
  q: { slab: Quantity; formwork: Quantity; concrete: Quantity; rebar: Quantity },
  rebar: RebarCondition,
): DetailLine[] {
  const basis: Record<'slab' | 'formwork' | 'concrete' | 'rebar', string> = {
    slab: '外形の面積 × 階数（仮置きの印）',
    formwork: '床版と同じ面積（支保工は含めない）',
    concrete: `厚さ ${SLAB_THICKNESS_MM} mm × 面積 × 階数（厚さは仮置き）`,
    rebar: `被り厚 ${rebar.coverMm} mm・${rebar.joint}（係数は仮置き）`,
  }
  return (['slab', 'formwork', 'concrete', 'rebar'] as const).map((key) => {
    const src = q[key]
    return {
      lineId: `${objectId}/${key}`,
      objectId,
      category: src.category,
      item: src.item,
      quantity: src.quantity,
      unit: src.unit,
      unitPriceRef: null,
      provisional: src.provisional,
      basis: basis[key],
      source: sourceOf(src.item, src.provisional),
    }
  })
}
