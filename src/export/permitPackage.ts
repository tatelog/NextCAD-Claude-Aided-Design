// 確認申請の一式の中身（統括の依頼 2026-11-06。1-b）。フォルダ名とファイル名はここ（PACKAGE_LAYOUT）の一か所だけ。分け方は設計グリルで確認中。
import type { PermitJudgement } from '../law/permitRequired'
import { applicabilityTextOf } from '../permit/p5Judgement'
import { DRAWING_KEY_OF_NAME, DRAWING_MISSING_DEFAULT, viewerRowsOf, type ViewerGroup } from '../permit/permitViewer'

export const PACKAGE_LAYOUT = {
  /** 直下: 表紙の役（判定の一覧） */
  judgementFile: '00_書類一覧.txt',
  /** 直下: まだ埋まっていないもの */
  blankFile: '空欄の一覧.txt',
  folders: { form: '01_申請書', drawing: '02_図面', bim: '03_BIM' },
  /** 図面のファイル名（02_図面 の中） */
  drawingFiles: { site: '配置図.svg', floorPlan: '各階平面図.svg' },
} as const

export interface PackageInput {
  judgement: PermitJudgement
  docs: readonly { name: string; kind: string }[]
  /** 配置図と各階平面図の SVG（図枠つき）。作れないものは null。作れないときの理由（無ければ既定の文）を添える */
  drawings: { site: string | null; floorPlan: string | null; reasons?: { site: string; floorPlan: string } }
  /** IFC の文字。外形が閉じていなければ null */
  ifcText: string | null
  /** IFC のファイル名（例: model-ifc4.ifc） */
  ifcFileName: string
  /** 欄に値を入れて書き出した様式（docx）。01_申請書/ に、そのままのバイト列で入る。無ければ省く */
  filledForms?: { fileName: string; bytes: Uint8Array }[]
  /** 空欄の一覧に添える注（例: 敷地面積は公図からの参考値）。無ければ省く */
  notes?: readonly string[]
}

export interface PackageFile {
  path: string
  /** テキストのファイルの中身（バイト列のファイルは空） */
  text: string
  /** バイト列のファイル（docx など）の中身 */
  bytes?: Uint8Array
}

const GROUPS: readonly ViewerGroup[] = ['要る', '要確認', '要らない']

/** 00_書類一覧.txt の中身。適用の区分と、要る・要確認・要らない（要らないは理由つき） */
export function judgementTextOf(j: PermitJudgement, docs: PackageInput['docs']): string {
  const rows = viewerRowsOf(j, docs)
  const lines: string[] = [applicabilityTextOf(j), '']
  for (const g of GROUPS) {
    const list = rows.filter((r) => r.group === g)
    lines.push(`${g}（${list.length}）`)
    for (const r of list) lines.push(r.reason === null ? `  ${r.name}` : `  ${r.name}：${r.reason}`)
    lines.push('')
  }
  return lines.join('\n')
}

/** 空欄の一覧.txt の中身。配置図と各階平面図が無ければ理由を出す。要る・要確認の書類は中身の種類つき。IFC が無ければその旨 */
export function blankListTextOf(
  j: PermitJudgement,
  docs: PackageInput['docs'],
  ifcText: string | null,
  drawings: PackageInput['drawings'],
  notes: readonly string[] = [],
): string {
  const lines: string[] = []
  const reasons = drawings.reasons ?? DRAWING_MISSING_DEFAULT
  if (drawings.site === null) lines.push(`配置図：${reasons.site}`)
  if (drawings.floorPlan === null) lines.push(`各階平面図：${reasons.floorPlan}`)
  for (const n of notes) lines.push(n)
  for (const r of viewerRowsOf(j, docs)) {
    if (r.group === '要らない' || DRAWING_KEY_OF_NAME[r.name] !== undefined) continue
    lines.push(`${r.name}：${r.content}`)
  }
  if (ifcText === null) lines.push('IFC（BIM のモデル）：ボリュームで外形を閉じると作れます')
  return lines.join('\n') + '\n'
}

/** 一式に入れるファイルの一覧（パスとテキスト） */
export function permitPackageFilesOf(input: PackageInput): PackageFile[] {
  const files: PackageFile[] = [
    { path: PACKAGE_LAYOUT.judgementFile, text: judgementTextOf(input.judgement, input.docs) },
    { path: PACKAGE_LAYOUT.blankFile, text: blankListTextOf(input.judgement, input.docs, input.ifcText, input.drawings, input.notes ?? []) },
  ]
  if (input.drawings.site !== null) {
    files.push({ path: `${PACKAGE_LAYOUT.folders.drawing}/${PACKAGE_LAYOUT.drawingFiles.site}`, text: input.drawings.site })
  }
  if (input.drawings.floorPlan !== null) {
    files.push({ path: `${PACKAGE_LAYOUT.folders.drawing}/${PACKAGE_LAYOUT.drawingFiles.floorPlan}`, text: input.drawings.floorPlan })
  }
  if (input.ifcText !== null) files.push({ path: `${PACKAGE_LAYOUT.folders.bim}/${input.ifcFileName}`, text: input.ifcText })
  for (const f of input.filledForms ?? []) {
    files.push({ path: `${PACKAGE_LAYOUT.folders.form}/${f.fileName}`, text: '', bytes: f.bytes })
  }
  return files
}
