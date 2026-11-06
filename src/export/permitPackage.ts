// 確認申請の一式の中身（統括の依頼 2026-11-06。1-b）。フォルダ名とファイル名はここ（PACKAGE_LAYOUT）の一か所だけ。分け方は設計グリルで確認中。
import type { PermitJudgement } from '../law/permitRequired'
import { applicabilityTextOf } from '../permit/p5Judgement'
import { viewerRowsOf, type ViewerGroup } from '../permit/permitViewer'

export const PACKAGE_LAYOUT = {
  /** 直下: 表紙の役（判定の一覧） */
  judgementFile: '00_書類一覧.txt',
  /** 直下: まだ埋まっていないもの */
  blankFile: '空欄の一覧.txt',
  folders: { form: '01_申請書', drawing: '02_図面', bim: '03_BIM' },
} as const

export interface PackageInput {
  judgement: PermitJudgement
  docs: readonly { name: string; kind: string }[]
  /** 図枠の SVG（1-c のあとは中身つきの図面） */
  frameSvg: string
  /** IFC の文字。外形が閉じていなければ null */
  ifcText: string | null
  /** IFC のファイル名（例: model-ifc4.ifc） */
  ifcFileName: string
}

export interface PackageFile {
  path: string
  text: string
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

/** 空欄の一覧.txt の中身。要る・要確認の書類を中身の種類つきで並べ、IFC が無ければその旨を出す */
export function blankListTextOf(j: PermitJudgement, docs: PackageInput['docs'], ifcText: string | null): string {
  const lines = viewerRowsOf(j, docs)
    .filter((r) => r.group !== '要らない')
    .map((r) => `${r.name}：${r.content}`)
  if (ifcText === null) lines.push('IFC（BIM のモデル）：ボリュームで外形を閉じると作れます')
  return lines.join('\n') + '\n'
}

/** 一式に入れるファイルの一覧（パスとテキスト） */
export function permitPackageFilesOf(input: PackageInput): PackageFile[] {
  const files: PackageFile[] = [
    { path: PACKAGE_LAYOUT.judgementFile, text: judgementTextOf(input.judgement, input.docs) },
    { path: PACKAGE_LAYOUT.blankFile, text: blankListTextOf(input.judgement, input.docs, input.ifcText) },
    { path: `${PACKAGE_LAYOUT.folders.drawing}/図枠.svg`, text: input.frameSvg },
  ]
  if (input.ifcText !== null) files.push({ path: `${PACKAGE_LAYOUT.folders.bim}/${input.ifcFileName}`, text: input.ifcText })
  return files
}
