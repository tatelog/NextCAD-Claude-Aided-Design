// 仕様（統括の依頼 2026-11-05、t91。G46・D-02 C10・t30）: P5 の図書は、判定（requiredPermitDocuments）の結果で出す。
// 仕様 1（案件の入力）: 案件の項目（構造・用途・日影規制区域・構造計算・代理者・BIM・認定部材・建築設備・昇降機）は P5 で入れられる。既定は RC・共同住宅、ほかは「いいえ」。
// 仕様 2（三区分）: 判定の行は「要る」「要らない（理由）」「要確認（理由）」の三区分。要確認は一行も落とさない。法 6 条 1 項・20 条 1 項の区分を出す。
// 仕様 3（全件）: 行は判定の全件（図書の定義の数）。固定の 12 行には戻らない。
// 仕様 4（外形）: P2 の閉じた外形から、IFC の外形と体積を作る。外形が閉じていなければ「外形が未作成」。
// 仕様 5（法的チェック）: 図書ごとの法的チェックは、図書の名前で決まる（日影・道路斜線・申請者の記入）。
// 仕様 6（図枠）: 印刷の図枠は、選んだ用紙（A3 横・A1）の図枠を使う。
import { describe, expect, it } from 'vitest'
import documentsJson from '../law/permitDocuments.json'
import { frameSvg } from '../law/permitFrameSvg'
import { requiredPermitDocuments, type PermitInput, type PermitJudgement } from '../law/permitRequired'
import { usePermitProject } from '../store/permitProject'
import { applicabilityTextOf, frameSizeOf, judgementRowsOf, legalCheckOfDoc, outlineStateOf, volumeOfOutline } from './p5Judgement'

const sample: PermitInput = {
  structure: 'RC',
  storeys: 3,
  heightM: 9,
  totalFloorAreaM2: 600,
  areaAbove31M2: 0,
  storeysAbove31: 0,
  usage: '共同住宅',
  inShadowRegulationArea: false,
  structuralCalc: false,
  hasBuildingEquipment: false,
  hasElevator: false,
  hasAgent: false,
  bimSubmission: false,
  usesCertifiedParts: false,
}

describe('案件の入力（仕様 1）', () => {
  it('既定は RC・共同住宅、ほかは「いいえ」。setter で変わる', () => {
    const s = usePermitProject.getState()
    expect(s.project).toEqual({
      structure: 'RC',
      usage: '共同住宅',
      inShadowRegulationArea: false,
      structuralCalc: false,
      hasAgent: false,
      bimSubmission: false,
      usesCertifiedParts: false,
      hasBuildingEquipment: false,
      hasElevator: false,
    })
    s.set('structure', 'SRC')
    s.set('hasElevator', true)
    expect(usePermitProject.getState().project.structure).toBe('SRC')
    expect(usePermitProject.getState().project.hasElevator).toBe(true)
    usePermitProject.setState({ project: s.project })
  })
})

describe('三区分と法の区分（仕様 2）', () => {
  it('要確認は、理由つきで一行も落とさない。要らないは理由つき', () => {
    const j: PermitJudgement = {
      required: ['確認申請書（第二号様式）'],
      notRequired: [{ name: '委任状', reason: '代理者が申請しない' }],
      needsCheck: [{ name: '日影図', reason: '条例値が未確認' }],
      applicability: { article6: '2号', article20: '3号' },
    }
    expect(judgementRowsOf(j)).toEqual([
      { kind: '要る', name: '確認申請書（第二号様式）' },
      { kind: '要らない', name: '委任状', reason: '代理者が申請しない' },
      { kind: '要確認', name: '日影図', reason: '条例値が未確認' },
    ])
  })

  it('法 6 条 1 項・20 条 1 項の区分を、文で出す', () => {
    const j = requiredPermitDocuments(sample)
    const text = applicabilityTextOf(j)
    expect(text).toContain('法6条1項')
    expect(text).toContain('法20条1項')
    expect(text).toContain(j.applicability.article6)
    expect(text).toContain(j.applicability.article20)
  })
})

// 仕様（施行令129条の13の2、t24）: 非常用の昇降機の図書は、31m超の床面積が500㎡を超え、第3号（耐火・区画）の入力が無いあいだは「要確認」。理由は第3号の入力待ちの語で、画面の行に出る。
describe('非常用の昇降機（D32）の行（仕様 2 の続き）', () => {
  const NON_ELEVATOR = '非常用の昇降機の図書（法34条2項、高さ31m超）'

  it('31m超の床面積が500㎡を超える共同住宅は、要確認の行に理由つきで出る（要らないには入らない）', () => {
    const rows = judgementRowsOf(requiredPermitDocuments({ ...sample, storeys: 15, heightM: 48, totalFloorAreaM2: 6000, areaAbove31M2: 2400 }))
    const row = rows.find((r) => r.name === NON_ELEVATOR)
    expect(row?.kind).toBe('要確認')
    expect(row?.reason).toContain('第3号')
  })

  // 仕様（代表の指示 2026-11-06）: 階数・面積で変わる図書は、勝手に対象から外さず、要確認と同じ扱いにする。
  it('31m超の床面積が500㎡以下なら、第2号の除外に当たる。要らないとは出さず、要確認の行に理由つきで出る', () => {
    const rows = judgementRowsOf(requiredPermitDocuments({ ...sample, storeys: 15, heightM: 48, totalFloorAreaM2: 6000, areaAbove31M2: 400 }))
    const row = rows.find((r) => r.name === NON_ELEVATOR)
    expect(row?.kind).toBe('要確認')
    expect(row?.reason).toContain('500㎡以下')
  })
})

describe('一覧は判定の全件（仕様 3）', () => {
  it('行の数は図書の定義の数と同じで、どの図書も一度ずつ出る', () => {
    const rows = judgementRowsOf(requiredPermitDocuments(sample))
    const defs = (documentsJson as unknown as { documents: { name: string }[] }).documents
    expect(rows).toHaveLength(defs.length)
    expect(rows.map((r) => r.name).sort()).toEqual(defs.map((d) => d.name).sort())
  })
})

describe('外形（仕様 4）', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10_000, y: 0 },
    { x: 10_000, y: 10_000 },
    { x: 0, y: 10_000 },
  ]

  it('閉じていない外形は「外形が未作成」', () => {
    expect(outlineStateOf({ closed: false, footprint: null })).toEqual({ ok: false, reason: '外形が未作成' })
  })

  it('閉じた外形は、描いた位置のまま外形になる', () => {
    expect(outlineStateOf({ closed: true, footprint: square })).toEqual({ ok: true, footprint: square })
  })

  it('外形から体積を作る（階数 3・階高 3000 mm で高さ 9000 mm）', () => {
    const r = volumeOfOutline(square, 3, 3000)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.volume.storey_count).toBe(3)
      expect(r.volume.total_height).toBe(9000)
    }
  })
})

describe('法的チェック（仕様 5）', () => {
  const legal = { roadSlope: null, shadow: null, applicantFilled: false }

  it('日影図は、条例値が未決の間は未判定', () => {
    expect(legalCheckOfDoc('日影図', legal).text).toContain('未判定')
  })

  it('日影が適合なら「日影 適合」', () => {
    expect(legalCheckOfDoc('日影図', { ...legal, shadow: '適合' }).text).toBe('日影 適合')
  })

  it('立面図は道路斜線が要確認のまま', () => {
    expect(legalCheckOfDoc('二面以上の立面図', legal).text).toContain('道路斜線 要確認')
  })

  it('申請書は申請者の記入で決まる', () => {
    expect(legalCheckOfDoc('確認申請書（第二号様式）', { ...legal, applicantFilled: true }).text).toBe('記入済')
  })
})

describe('図枠（仕様 6）', () => {
  it('選んだ用紙は、図枠の用紙に対応する', () => {
    expect(frameSizeOf('A3横')).toBe('A3')
    expect(frameSizeOf('A1')).toBe('A1')
    expect(frameSvg({ size: frameSizeOf('A3横'), values: {} }).svg).toContain('<svg')
  })
})
