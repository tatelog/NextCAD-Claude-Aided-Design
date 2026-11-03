import { describe, expect, it } from 'vitest'
import { requiredPermitDocuments, type PermitInput } from './permitRequired'

// 仕様（建築基準法施行規則 第1条の3、法6条・20条、D-03 T-11 図書ルール）から書いたテスト。
// 板状の RC 造共同住宅を基準の案件にし、1 項目ずつ条件を変える。

const plateRc: PermitInput = {
  structure: 'RC',
  storeys: 4,
  heightM: 14,
  totalFloorAreaM2: 800,
  usage: '共同住宅',
  inShadowRegulationArea: false,
  structuralCalc: false,
  hasBuildingEquipment: true,
  hasElevator: false,
  hasAgent: false,
  bimSubmission: false,
  usesCertifiedParts: false,
}

const rcOnlyRows = ['構造詳細図', '使用構造材料一覧表', '施工方法等計画書']

describe('要る図書の判定（施行規則 第1条の3・表一・表二(一)RC）', () => {
  it('RC造4階・高さ14m・延べ面積800㎡の共同住宅は、表一と表二(一)RCの図書が要る', () => {
    const { required } = requiredPermitDocuments(plateRc)
    expect(required).toEqual(
      expect.arrayContaining([
        '確認申請書（第二号様式）',
        '建築計画概要書（第三号様式）',
        '付近見取図',
        '配置図',
        '各階平面図',
        '床面積求積図',
        '二面以上の立面図',
        '二面以上の断面図',
        '基礎伏図',
        '各階床伏図',
        '小屋伏図',
        '二面以上の軸組図',
        '構造詳細図',
        '使用構造材料一覧表',
        '施工方法等計画書',
        '令第73条・第77条・第77条の2・第79条の確認に必要な図書',
        '建築設備の図書',
        '建築設備の概要書（別記第八号様式）',
        '界壁に関する図書（法30条・表二(十二)）',
      ]),
    )
  })

  it('委任状・誓約書・構造計算書・日影図・認定書の写しは、条件がなければ要らない', () => {
    const { required, notRequired } = requiredPermitDocuments(plateRc)
    for (const name of ['委任状', '誓約書（建築物等情報モデル図書申請）', '構造計算書（表三）', '日影図', '認定書の写し（表四）']) {
      expect(required).not.toContain(name)
      expect(notRequired.map((n) => n.name)).toContain(name)
    }
  })

  it('高さ20mを超えるRC造は構造計算書（表三）が要る', () => {
    const { required } = requiredPermitDocuments({ ...plateRc, storeys: 5, heightM: 21 })
    expect(required).toContain('構造計算書（表三）')
  })

  it('高さ20mちょうどのRC造は、構造計算を選ばなければ構造計算書は要らない', () => {
    const plain = requiredPermitDocuments({ ...plateRc, storeys: 5, heightM: 20 })
    expect(plain.required).not.toContain('構造計算書（表三）')
    const calc = requiredPermitDocuments({ ...plateRc, storeys: 5, heightM: 20, structuralCalc: true })
    expect(calc.required).toEqual(expect.arrayContaining(['構造計算書（表三）', '建築士法第20条第2項の証明書の写し']))
  })

  it('日影規制区域内で高さ10mを超えると日影図が要る。10m以下や区域外は要らない', () => {
    const inArea = requiredPermitDocuments({ ...plateRc, inShadowRegulationArea: true, heightM: 12 })
    expect(inArea.required).toContain('日影図')

    const atTen = requiredPermitDocuments({ ...plateRc, inShadowRegulationArea: true, heightM: 10 })
    expect(atTen.required).not.toContain('日影図')

    const outside = requiredPermitDocuments({ ...plateRc, inShadowRegulationArea: false, heightM: 12 })
    expect(outside.required).not.toContain('日影図')
  })

  it('BIM由来の図書で申請するときは誓約書が要る', () => {
    const { required } = requiredPermitDocuments({ ...plateRc, bimSubmission: true })
    expect(required).toContain('誓約書（建築物等情報モデル図書申請）')
  })

  it('代理者が申請するときは委任状が要る', () => {
    const { required } = requiredPermitDocuments({ ...plateRc, hasAgent: true })
    expect(required).toContain('委任状')
  })

  it('RC造以外の建築物は、RCだけの図書を要求せず、対象外の理由を付けて返す', () => {
    const wood = requiredPermitDocuments({ ...plateRc, structure: 'W', storeys: 2, heightM: 8, totalFloorAreaM2: 150 })
    for (const row of rcOnlyRows) {
      expect(wood.required).not.toContain(row)
      const hit = wood.notRequired.find((n) => n.name === row)
      expect(hit?.reason).toContain('RC')
    }
  })

  it('建築設備を含まないときは、建築設備の図書と概要書は要らない', () => {
    const { required } = requiredPermitDocuments({ ...plateRc, hasBuildingEquipment: false })
    expect(required).not.toContain('建築設備の図書')
    expect(required).not.toContain('建築設備の概要書（別記第八号様式）')
  })

  it('界壁の図書は共同住宅で要り、他の用途では要らない', () => {
    const housing = requiredPermitDocuments(plateRc)
    expect(housing.required).toContain('界壁に関する図書（法30条・表二(十二)）')

    const office = requiredPermitDocuments({ ...plateRc, usage: '事務所' })
    expect(office.required).not.toContain('界壁に関する図書（法30条・表二(十二)）')
  })

  it('適用条件が未確認の図書は要不要を決めず、要確認として分けて返す', () => {
    const { required, needsCheck } = requiredPermitDocuments(plateRc)
    const unresolved = [
      '防火区画の図書（法26条・表二(七)）',
      '住宅用防災機器の図書（消防法9条の2・表二(六十五)）',
      '道路・隣地・北側の高さ制限に関する図書（表二(二十八)）',
      '表五の計算書（未精査）',
      '表二のその他の行（未精査）',
    ]
    for (const name of unresolved) {
      expect(needsCheck.map((n) => n.name)).toContain(name)
      expect(required).not.toContain(name)
    }
  })

  it('6条1項と20条1項の区分を返す（RC造14m・共同住宅800㎡は 6条1項1号、20条1項3号）', () => {
    // 6条1項2号は「前号に掲げる建築物を除くほか」なので、1号の建築物は2号に入らない（e-Gov 法6条1項の原文で確認）。
    const { applicability } = requiredPermitDocuments(plateRc)
    expect(applicability.article6).toBe('1号')
    expect(applicability.article20).toBe('3号')
  })

  it('特殊建築物でない2階建てで延べ面積200㎡以下は 6条1項2号、延べ面積200㎡以下の平屋は 6条1項3号', () => {
    const twoStorey = requiredPermitDocuments({ ...plateRc, usage: '戸建住宅', storeys: 2, totalFloorAreaM2: 150 })
    expect(twoStorey.applicability.article6).toBe('2号')
    const oneStorey = requiredPermitDocuments({ ...plateRc, usage: '戸建住宅', storeys: 1, totalFloorAreaM2: 150 })
    expect(oneStorey.applicability.article6).toBe('3号')
  })

  it('20条1項の区分は、RC造で高さ20m超なら2号、高さ60m超なら1号になる', () => {
    expect(requiredPermitDocuments({ ...plateRc, heightM: 21 }).applicability.article20).toBe('2号')
    expect(requiredPermitDocuments({ ...plateRc, storeys: 20, heightM: 61 }).applicability.article20).toBe('1号')
  })
})

describe('高さ31m（法34条2項・令81条・消防法8条の2）', () => {
  const NON_ELEVATOR = '非常用の昇降機の図書（法34条2項、高さ31m超）'
  const HIGH_FIRE = '高層建築物に係る消防関係の図書（消防法8条の2）'

  it('高さ31mを超えると、非常用の昇降機の図書と構造計算書が要る', () => {
    const { required } = requiredPermitDocuments({ ...plateRc, storeys: 10, heightM: 32 })
    expect(required).toEqual(expect.arrayContaining([NON_ELEVATOR, '構造計算書（表三）']))
  })

  it('高さ31m以下なら、非常用の昇降機の図書は要らない', () => {
    const { required, notRequired } = requiredPermitDocuments({ ...plateRc, heightM: 31 })
    expect(required).not.toContain(NON_ELEVATOR)
    expect(notRequired.map((n) => n.name)).toContain(NON_ELEVATOR)
  })

  it('高さ31m超の消防関係の図書は、範囲が未確認なので要確認に分ける', () => {
    const { required, needsCheck } = requiredPermitDocuments({ ...plateRc, storeys: 10, heightM: 32 })
    expect(required).not.toContain(HIGH_FIRE)
    expect(needsCheck.map((n) => n.name)).toContain(HIGH_FIRE)
  })

  it('高さ31m以下なら、高層建築物の消防関係の図書は要確認にもならない', () => {
    const { needsCheck, notRequired } = requiredPermitDocuments({ ...plateRc, heightM: 14 })
    expect(needsCheck.map((n) => n.name)).not.toContain(HIGH_FIRE)
    expect(notRequired.map((n) => n.name)).toContain(HIGH_FIRE)
  })

  it('日影図を要らない理由は、当たらない条件（区域の外・高さ10m以下）の組み合わせで決まる', () => {
    const reasonOf = (input: Parameters<typeof requiredPermitDocuments>[0]) =>
      requiredPermitDocuments(input).notRequired.find((n) => n.name === '日影図')?.reason ?? ''

    const outsideAndLow = reasonOf({ ...plateRc, inShadowRegulationArea: false, heightM: 9 })
    expect(outsideAndLow).toContain('日影規制区域の外')
    expect(outsideAndLow).toContain('高さ10m以下')

    const insideAndLow = reasonOf({ ...plateRc, inShadowRegulationArea: true, heightM: 9 })
    expect(insideAndLow).toContain('高さ10m以下')
    expect(insideAndLow).not.toContain('区域の外')

    const outsideAndHigh = reasonOf({ ...plateRc, inShadowRegulationArea: false, heightM: 31 })
    expect(outsideAndHigh).toContain('日影規制区域の外')
    expect(outsideAndHigh).not.toContain('高さ10m以下')
  })

  it('日影規制区域内で高さ31mなら、日影図が要る（高さ10m以下の理由は当たらない）', () => {
    const { required } = requiredPermitDocuments({ ...plateRc, inShadowRegulationArea: true, heightM: 31 })
    expect(required).toContain('日影図')
  })
})
