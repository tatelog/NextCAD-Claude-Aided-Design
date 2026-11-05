import { describe, expect, it } from 'vitest'
import { requiredPermitDocuments, type PermitInput } from './permitRequired'
import documentsJson from './permitDocuments.json'

// 仕様（建築基準法施行規則 第1条の3、法6条・20条、D-03 T-11 図書ルール）から書いたテスト。
// 板状の RC 造共同住宅を基準の案件にし、1 項目ずつ条件を変える。

const plateRc: PermitInput = {
  structure: 'RC',
  storeys: 4,
  heightM: 14,
  totalFloorAreaM2: 800,
  areaAbove31M2: 0,
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
        '建築設備の図書',
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
      '令第73条・第77条・第77条の2・第79条の確認に必要な図書',
      '表五の計算書（特例・検証法を使う場合）',
      '消防法9条の市町村条例に関する図書（表二(六十四)）',
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
  const OUTLET = '非常コンセント設備の図（消防法施行令29条の2、地階を除く階数11以上）'

  // 仕様（施行令129条の13の2 第1項）: 除外は4つ。第2号（31m超の床面積500㎡以下）は数値で決まる。
  // 第1号（機械室等だけの部分）と第4号（工場・倉庫）は用途で決まる。第3号（耐火・床面積100㎡ごとの区画）は設計の入力が要るので要確認。
  it('高さ31mを超え、31m超の部分の床面積が500㎡を超える共同住宅は、非常用の昇降機の図書が要確認になる（第3号の耐火・区画が未入力）', () => {
    const { required, needsCheck } = requiredPermitDocuments({ ...plateRc, storeys: 10, heightM: 32, areaAbove31M2: 1_200 })
    expect(required).toContain('構造計算書（表三）')
    expect(required).not.toContain(NON_ELEVATOR)
    expect(needsCheck.map((n) => n.name)).toContain(NON_ELEVATOR)
  })

  it('工場・倉庫の用途は、第4号の除外に当たるかの入力がないので、非常用の昇降機の図書は要確認になる', () => {
    const { required, needsCheck } = requiredPermitDocuments({ ...plateRc, usage: '工場', heightM: 32, areaAbove31M2: 1_200 })
    expect(required).not.toContain(NON_ELEVATOR)
    expect(needsCheck.map((n) => n.name)).toContain(NON_ELEVATOR)
  })

  it('31m超の部分の床面積が500㎡以下なら、政令の除外で非常用の昇降機の図書は要らない（施行令129条の13の2 第1項第2号）', () => {
    const { required, notRequired } = requiredPermitDocuments({ ...plateRc, storeys: 11, heightM: 33, areaAbove31M2: 400 })
    expect(required).not.toContain(NON_ELEVATOR)
    expect(notRequired.map((n) => n.name)).toContain(NON_ELEVATOR)
  })

  it('31m超の部分の床面積が500㎡を超えると、第2号の除外に当たらない（第3号の判断が要るので要確認）', () => {
    const { required, needsCheck } = requiredPermitDocuments({ ...plateRc, storeys: 15, heightM: 48, areaAbove31M2: 2_400 })
    expect(required).not.toContain(NON_ELEVATOR)
    expect(needsCheck.map((n) => n.name)).toContain(NON_ELEVATOR)
  })

  it('高さ31m以下なら、非常用の昇降機の図書は要らない', () => {
    const { required, notRequired } = requiredPermitDocuments({ ...plateRc, heightM: 31 })
    expect(required).not.toContain(NON_ELEVATOR)
    expect(notRequired.map((n) => n.name)).toContain(NON_ELEVATOR)
  })

  it('地上11階以上では、非常コンセント設備の図が要る（消防法施行令29条の2）', () => {
    const { required } = requiredPermitDocuments({ ...plateRc, storeys: 11, heightM: 33 })
    expect(required).toContain(OUTLET)
  })

  it('連結送水管の図は、地階を除く階数7以上で要る（施行令29条1項1号・共同住宅）', () => {
    const CONN = '連結送水管の図（消防法施行令29条）'
    expect(requiredPermitDocuments({ ...plateRc, storeys: 7, heightM: 21 }).required).toContain(CONN)
    expect(requiredPermitDocuments({ ...plateRc, storeys: 6, heightM: 18, totalFloorAreaM2: 2000 }).required).not.toContain(CONN)
  })

  it('連結送水管の図は、5階以上で延べ面積6000㎡以上でも要る（施行令29条1項2号）', () => {
    const CONN = '連結送水管の図（消防法施行令29条）'
    expect(requiredPermitDocuments({ ...plateRc, storeys: 5, heightM: 15, totalFloorAreaM2: 6000 }).required).toContain(CONN)
    expect(requiredPermitDocuments({ ...plateRc, storeys: 5, heightM: 15, totalFloorAreaM2: 5999 }).required).not.toContain(CONN)
  })

  it('地上10階以下では、非常コンセント設備の図は要らない', () => {
    const { required, notRequired } = requiredPermitDocuments({ ...plateRc, storeys: 10, heightM: 31 })
    expect(required).not.toContain(OUTLET)
    expect(notRequired.map((n) => n.name)).toContain(OUTLET)
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

// 仕様（2026-11-05 取得の原文）: 施行規則 表一・表二・表五、施行令10条・29条・29条の2、法20条・26条・56条。
// 原文で決まる条件は要る・要らないで返す。特例や条例など入力がないものは要確認にして、要るとは決めない。
describe('原文（施行規則・施行令・法）で確かめた条件', () => {
  const SPECIAL_RC = '令第73条・第77条・第77条の2・第79条の確認に必要な図書'
  const TABLE5 = '表五の計算書（特例・検証法を使う場合）'
  const FIREWALL = '防火壁・防火床の図書（法26条・表二(七)）'
  const HEIGHT_LIMIT = '道路・隣地・北側の高さ制限に関する図書（表二(二十八)）'
  const FIRE_CODE = '消防用設備等の図書（消防法17条・表二(六十七)）'
  const BYLAW = '消防法9条の市町村条例に関する図書（表二(六十四)）'

  it('表二(一)RC の令73条等の確認図書は、特例を使うか未入力のときは要確認になり、要るとは決めない', () => {
    const { required, needsCheck } = requiredPermitDocuments(plateRc)
    expect(required).not.toContain(SPECIAL_RC)
    expect(needsCheck.map((n) => n.name)).toContain(SPECIAL_RC)
  })

  it('RC造以外では、令73条等の確認図書は要らない（RC造に限る）', () => {
    const wood = requiredPermitDocuments({ ...plateRc, structure: 'W', storeys: 2, heightM: 8, totalFloorAreaM2: 150 })
    expect(wood.notRequired.map((n) => n.name)).toContain(SPECIAL_RC)
  })

  it('表五の計算書は、特例や検証法を使うか未入力のとき要確認になる', () => {
    const { required, needsCheck } = requiredPermitDocuments(plateRc)
    expect(required).not.toContain(TABLE5)
    expect(needsCheck.map((n) => n.name)).toContain(TABLE5)
  })

  it('防火壁・防火床（法26条）は、延べ面積1000㎡以下なら要らない', () => {
    const { required, notRequired } = requiredPermitDocuments(plateRc)
    expect(required).not.toContain(FIREWALL)
    expect(notRequired.find((n) => n.name === FIREWALL)?.reason).toContain('1000㎡以下')
  })

  it('防火壁・防火床（法26条）は、延べ面積が1000㎡を超えると、耐火建築物か未入力のとき要確認になる', () => {
    const { required, needsCheck } = requiredPermitDocuments({ ...plateRc, totalFloorAreaM2: 1_200 })
    expect(required).not.toContain(FIREWALL)
    expect(needsCheck.map((n) => n.name)).toContain(FIREWALL)
  })

  it('道路・隣地・北側の高さ制限の図書（表二(二十八)）は、法56条が建築物に適用されるので要る', () => {
    expect(requiredPermitDocuments(plateRc).required).toContain(HEIGHT_LIMIT)
  })

  it('消防用設備等の図書は、共同住宅で延べ面積150㎡以上なら要る（施行令10条1項2号イ、別表第一（五）項）', () => {
    expect(requiredPermitDocuments(plateRc).required).toContain(FIRE_CODE)
    const exactly = requiredPermitDocuments({ ...plateRc, storeys: 2, totalFloorAreaM2: 150 })
    expect(exactly.required).toContain(FIRE_CODE)
  })

  it('共同住宅で延べ面積150㎡未満かつ2階以下なら、消防用設備等の図書は要らない', () => {
    const { required, notRequired } = requiredPermitDocuments({ ...plateRc, storeys: 2, totalFloorAreaM2: 120 })
    expect(required).not.toContain(FIRE_CODE)
    expect(notRequired.map((n) => n.name)).toContain(FIRE_CODE)
  })

  it('共同住宅で延べ面積150㎡未満・3階以上は、3階以上の階の床面積が入力にないため要確認になる（施行令10条1項5号）', () => {
    const { required, needsCheck } = requiredPermitDocuments({ ...plateRc, storeys: 3, totalFloorAreaM2: 120 })
    expect(required).not.toContain(FIRE_CODE)
    expect(needsCheck.map((n) => n.name)).toContain(FIRE_CODE)
  })

  it('消防用設備等の図書は高さでは決まらない（31m以下でも、31m超でも、共同住宅で延べ面積150㎡以上なら要る）', () => {
    expect(requiredPermitDocuments({ ...plateRc, heightM: 14 }).required).toContain(FIRE_CODE)
    expect(requiredPermitDocuments({ ...plateRc, storeys: 10, heightM: 32 }).required).toContain(FIRE_CODE)
  })

  it('共同住宅以外の用途では、この消防用設備の図書は要らない（別表第一（五）項ロに当たらない）', () => {
    const { required, notRequired } = requiredPermitDocuments({ ...plateRc, usage: '事務所' })
    expect(required).not.toContain(FIRE_CODE)
    expect(notRequired.map((n) => n.name)).toContain(FIRE_CODE)
  })

  it('消防の図書の細目（施行令10条・29条・29条の2）は、条文の数値のまま図書マスタに入っている', () => {
    const details = (id: string) => (documentsJson as { documents: { id: string; details?: string[] }[] }).documents.find((d) => d.id === id)?.details ?? []
    expect(details('D33').join('\n')).toContain('延べ面積150㎡以上')
    expect(details('D33').join('\n')).toContain('延べ面積500㎡以上')
    expect(details('D34').join('\n')).toContain('水平距離は50m以下')
    expect(details('D35').join('\n')).toContain('水平距離は50m以下')
    expect(details('D35').join('\n')).toContain('100mm以上')
  })

  // 仕様（消防法施行規則 第31条 六・七。e-Gov 法令一覧で引いた法令ID 336M50000008006、2026-11-05 取得）:
  // 地階を除く階数11以上の連結送水管。高さ70m超は、ポンプの吐出量（800L/分）と全揚程（60m以上）、起動装置の遠隔操作。
  // 11階以上は、放水用器具（長さ20mのホース4本以上、筒先2本以上）と格納箱（3階以内ごと、放水口から歩行距離5m以内）。非常電源は加圧送水装置を2時間以上作動できる容量。
  it('連結送水管の加圧送水装置の細目（施行規則 第31条六・七）は、条文の数値のまま図書マスタに入っている', () => {
    const joined = (documentsJson as { documents: { id: string; details?: string[] }[] }).documents.find((d) => d.id === 'D35')?.details?.join('\n') ?? ''
    expect(joined).toContain('800リットル毎分')
    expect(joined).toContain('全揚程は60m以上')
    expect(joined).toContain('2時間以上')
    expect(joined).toContain('長さ20mのホース4本以上')
    expect(joined).toContain('歩行距離5m以内')
  })

  it('消防法9条の市町村条例に関する図書（表二(六十四)）は、区の条例を確かめるまで要確認になる', () => {
    const { required, needsCheck } = requiredPermitDocuments(plateRc)
    expect(required).not.toContain(BYLAW)
    expect(needsCheck.map((n) => n.name)).toContain(BYLAW)
  })

  const SHEET = '建築設備の概要書（別記第八号様式）'
  const CERT = '認定書の写し（表四）'

  it('建築設備があるだけでは概要書は要らず、昇降機か特定行政庁の指定設備の有無が決まるまで要確認になる（第4項ロ・令146条1項）', () => {
    const { required, needsCheck } = requiredPermitDocuments(plateRc)
    expect(required).not.toContain(SHEET)
    expect(needsCheck.map((n) => n.name)).toContain(SHEET)
  })

  const HOUSING_FIRE = '住宅用防災機器の図書（消防法9条の2・表二(六十五)）'

  it('住宅用防災機器の図書は、共同住宅なら要る（消防法9条の2の「住宅」に共同住宅の住戸を含む）', () => {
    expect(requiredPermitDocuments(plateRc).required).toContain(HOUSING_FIRE)
  })

  it('戸建住宅など共同住宅以外の住宅用途は、住宅用防災機器の図書を要るとは決めず要確認にする', () => {
    const { required, needsCheck } = requiredPermitDocuments({ ...plateRc, usage: '戸建住宅', storeys: 2, totalFloorAreaM2: 150 })
    expect(required).not.toContain(HOUSING_FIRE)
    expect(needsCheck.map((n) => n.name)).toContain(HOUSING_FIRE)
  })

  it('建築設備の概要書は、6条1項1・2号の建築物に昇降機があれば、建築設備を含まなくても要る（第4項ロ・法87条の4）', () => {
    const { required } = requiredPermitDocuments({ ...plateRc, hasBuildingEquipment: false, hasElevator: true })
    expect(required).toContain(SHEET)
  })

  it('平屋で延べ面積200㎡以下の建築物は、建築設備があっても概要書は要らない（6条1項3号は第4項ロに当たらない）', () => {
    const { required, notRequired } = requiredPermitDocuments({
      ...plateRc,
      usage: '戸建住宅',
      storeys: 1,
      totalFloorAreaM2: 150,
      hasBuildingEquipment: true,
    })
    expect(required).not.toContain(SHEET)
    expect(notRequired.map((n) => n.name)).toContain(SHEET)
  })

  it('高さ31mを超えても、概要書の要否は高さでは決まらない。昇降機がなければ要確認になる（規則に31mの条件はない）', () => {
    const { required, needsCheck } = requiredPermitDocuments({
      ...plateRc,
      storeys: 10,
      heightM: 32,
      hasBuildingEquipment: false,
      hasElevator: false,
    })
    expect(required).not.toContain(SHEET)
    expect(needsCheck.map((n) => n.name)).toContain(SHEET)
  })

  it('認定書の写し（表四）は、認定部材を用いても、建築主事が求めるかは未入力なので要確認になり、要るとは決めない', () => {
    const { required, needsCheck } = requiredPermitDocuments({ ...plateRc, usesCertifiedParts: true })
    expect(required).not.toContain(CERT)
    expect(needsCheck.map((n) => n.name)).toContain(CERT)
  })
})
