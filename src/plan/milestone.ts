// 節目の要約（ハブ D-04 P3「節目（S7）は P3 の右側の要約」）。敷地・法規適合・階数階高・スパン・住戸数の 5 行。
// 決定論の処理だけ。値の出どころ（用途地域・斜線日影の判定・階数・スパン・住戸）は呼び出し側が渡す。
export type MilestoneStatus = 'ok' | 'todo' | 'ng'

export interface MilestoneRow {
  label: string
  status: MilestoneStatus
  /** 画面に出す値の説明（無ければ空） */
  note: string
}

export interface MilestoneInput {
  /** 用途地域が一つに決まっているか */
  zoneKnown: boolean
  /** 日影の判定の結果（判定が無いときは null） */
  shadow: '適合' | '不適合' | null
  roadSlope?: '適合' | '超過' | null
  storeyCount: number
  storeyHeightMm: number
  /** スパンの数（分からなければ null） */
  spanCount: number | null
  /** 住戸（区画）の数 */
  unitCount: number
}

export function milestoneSummary(input: MilestoneInput): MilestoneRow[] {
  const site: MilestoneRow = { label: '敷地', status: input.zoneKnown ? 'ok' : 'todo', note: input.zoneKnown ? '用途地域が決まっている' : '用途地域が未取得' }
  const law: MilestoneRow =
    input.shadow === null
      ? { label: '日影', status: 'todo', note: '日影の判定が無い' }
      : input.shadow === '適合'
        ? { label: '日影', status: 'ok', note: '日影は適合' }
        : { label: '日影', status: 'ng', note: '日影は不適合' }
  const storey: MilestoneRow = {
    label: '階数階高',
    status: input.storeyCount >= 1 && input.storeyHeightMm > 0 ? 'ok' : 'todo',
    note: `${input.storeyCount} 階 × ${(input.storeyHeightMm / 1000).toFixed(1)} m`,
  }
  const span: MilestoneRow =
    input.spanCount === null || input.spanCount <= 0 ? { label: 'スパン', status: 'todo', note: 'スパンが無い' } : { label: 'スパン', status: 'ok', note: `${input.spanCount} スパン` }
  const units: MilestoneRow =
    input.unitCount >= 1 ? { label: '住戸数', status: 'ok', note: `${input.unitCount} 戸（区画）` } : { label: '住戸数', status: 'todo', note: '住戸が無い' }
  const slope:MilestoneRow={label:'斜線',status:input.roadSlope==null?'todo':input.roadSlope==='適合'?'ok':'ng',note:input.roadSlope??'P2の判定なし'}
  return [site, slope, law, storey, span, units]
}
