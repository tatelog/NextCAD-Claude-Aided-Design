import documentsJson from './permitDocuments.json'

// 確認申請に要る図書の判定（施行規則 第1条の3・表一・表二、法6条1項・20条1項）。
// 図書の一覧と条件は permitDocuments.json が正本。ここは条件式を評価するだけで、条文を持たない。
// 判定は3つに分ける: 要る（required）・要らない（notRequired、理由つき）・適用条件が未確認（needsCheck）。
// 未確認を要らないと決めることはしない（D-02 C11 の三値の考え方）。

export type PermitStructure = 'RC' | 'SRC' | 'S' | 'W' | 'other'

export interface PermitInput {
  structure: PermitStructure
  /** 地上階数 */
  storeys: number
  /** 最高の高さ（m） */
  heightM: number
  /** 延べ面積（㎡）。共同住宅は用途部分と同じとして扱う（仮置き） */
  totalFloorAreaM2: number
  /** 用途（例: 共同住宅、事務所、戸建住宅） */
  usage: string
  /** 日影規制区域内か（自治体の指定。人が入力する） */
  inShadowRegulationArea: boolean
  /** 構造計算を行うか */
  structuralCalc: boolean
  /** 建築設備を含むか（施行規則 第1条の3 第4項） */
  hasBuildingEquipment: boolean
  /** 昇降機があるか */
  hasElevator: boolean
  /** 代理者が申請するか */
  hasAgent: boolean
  /** BIM 由来の図書で申請するか（建築物等情報モデル図書申請） */
  bimSubmission: boolean
  /** 認定を受けた部材・構造方法を用いるか */
  usesCertifiedParts: boolean
}

type Op = 'eq' | 'ne' | 'gt' | 'gte'
type Cond =
  | 'always'
  | { field: keyof PermitInput; op: Op; value: string | number | boolean; /** 当たらないときの理由の語（例: 高さ10m以下） */ notLabel?: string }
  | { all: Cond[] }
  | { any: Cond[] }
  | { unresolved: string }

interface DocDef {
  name: string
  when: Cond
  notApplicableReason?: string
}

type Verdict = { kind: 'yes' } | { kind: 'no' } | { kind: 'unknown'; reason: string }

const YES: Verdict = { kind: 'yes' }
const NO: Verdict = { kind: 'no' }

function compare(actual: unknown, op: Op, value: string | number | boolean): boolean {
  if (op === 'eq') return actual === value
  if (op === 'ne') return actual !== value
  if (op === 'gt') return typeof actual === 'number' && typeof value === 'number' && actual > value
  return typeof actual === 'number' && typeof value === 'number' && actual >= value
}

function evaluate(cond: Cond, input: PermitInput): Verdict {
  if (cond === 'always') return YES
  if ('unresolved' in cond) return { kind: 'unknown', reason: cond.unresolved }
  if ('field' in cond) return compare(input[cond.field], cond.op, cond.value) ? YES : NO
  if ('all' in cond) {
    const verdicts = cond.all.map((c) => evaluate(c, input))
    const no = verdicts.find((v) => v.kind === 'no')
    if (no) return NO
    const unknown = verdicts.find((v) => v.kind === 'unknown')
    return unknown ?? YES
  }
  const verdicts = cond.any.map((c) => evaluate(c, input))
  if (verdicts.some((v) => v.kind === 'yes')) return YES
  const unknown = verdicts.find((v) => v.kind === 'unknown')
  return unknown ?? NO
}

// 当たらなかった条件の語（notLabel）を集める。条件式の中で偽になった比較だけを数える
function missingLabels(cond: Cond, input: PermitInput): (string | undefined)[] {
  if (cond === 'always' || 'unresolved' in cond) return []
  if ('field' in cond) return compare(input[cond.field], cond.op, cond.value) ? [] : [cond.notLabel]
  if ('all' in cond) return cond.all.flatMap((c) => missingLabels(c, input))
  return cond.any.flatMap((c) => missingLabels(c, input))
}

// 要らない理由は、当たらなかった条件の語を並べる（例: 日影規制区域の外・高さ10m以下）。
// 語が無い条件が混じるときは、定義の notApplicableReason を使う。
function reasonOf(doc: DocDef, input: PermitInput): string {
  const labels = missingLabels(doc.when, input)
  if (labels.length > 0 && labels.every((l): l is string => typeof l === 'string')) return labels.join('・')
  return doc.notApplicableReason ?? '条件に当たらないため'
}

export interface PermitJudgement {
  /** 要る図書の名称 */
  required: string[]
  /** 要らない図書と、要らない理由 */
  notRequired: { name: string; reason: string }[]
  /** 適用条件が未確認で、要不要を決められない図書（要確認として人が見る） */
  needsCheck: { name: string; reason: string }[]
  /** 法6条1項・20条1項の区分（条文の判定順。1号を先に当てる） */
  applicability: { article6: '1号' | '2号' | '3号'; article20: '1号' | '2号' | '3号' | '要確認' }
}

const documents = (documentsJson as unknown as { documents: DocDef[] }).documents

/**
 * 案件の条件から、確認申請に要る図書を判定する。
 * 6条1項1号は特殊建築物（共同住宅のみ実装。他の用途は仮置き）で、用途部分の床面積が200㎡超のとき。
 * 6条1項2号は1号を除き、2階以上か延べ面積200㎡超。3号はそれ以外（都市計画区域内）。
 * 20条1項は高さ60m超が1号、RC造で高さ20m超が2号、RC造のそれ以外が3号。RC造以外は要確認。
 */
export function requiredPermitDocuments(input: PermitInput): PermitJudgement {
  const judgement: PermitJudgement = {
    required: [],
    notRequired: [],
    needsCheck: [],
    applicability: {
      article6: input.usage === '共同住宅' && input.totalFloorAreaM2 > 200 ? '1号' : input.storeys >= 2 || input.totalFloorAreaM2 > 200 ? '2号' : '3号',
      article20:
        input.heightM > 60 ? '1号' : input.structure === 'RC' && input.heightM > 20 ? '2号' : input.structure === 'RC' ? '3号' : '要確認',
    },
  }

  for (const doc of documents) {
    const verdict = evaluate(doc.when, input)
    if (verdict.kind === 'yes') judgement.required.push(doc.name)
    else if (verdict.kind === 'no') {
      judgement.notRequired.push({ name: doc.name, reason: reasonOf(doc, input) })
    } else judgement.needsCheck.push({ name: doc.name, reason: verdict.reason })
  }
  return judgement
}
