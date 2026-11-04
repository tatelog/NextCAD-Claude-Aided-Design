import { describe, expect, it } from 'vitest'
import { extrudeVolume } from '../volume/extrude'
import { permitInputFromVolume, type PermitProject } from './permitInput'
import { requiredPermitDocuments } from './permitRequired'

// 仕様（ユーザー指示 2026-11-04「条件はボリュームしだい。そこは可変する条件として」）から書いたテスト。
// 高さ・階数・延べ面積は、ボリュームの値から毎回決まる。敷地と案件の条件（日影規制区域・構造など）は別に入れる。

const project: PermitProject = {
  structure: 'RC',
  usage: '共同住宅',
  inShadowRegulationArea: false,
  structuralCalc: false,
  hasBuildingEquipment: true,
  hasElevator: false,
  hasAgent: false,
  bimSubmission: false,
  usesCertifiedParts: false,
}

// 20 m × 20 m の外形（反時計回り、mm）を階数分押し出す
function block(storeys: number, storeyHeight = 3_000) {
  return extrudeVolume({
    footprint: [
      { x: 0, y: 0 },
      { x: 20_000, y: 0 },
      { x: 20_000, y: 20_000 },
      { x: 0, y: 20_000 },
    ],
    storey_count: storeys,
    storey_height: storeyHeight,
  })
}

describe('ボリュームから作る判定の入力', () => {
  it('高さは階数×階高（mm）を m に直した値になる', () => {
    expect(permitInputFromVolume(block(5, 3_200), project).heightM).toBe(16)
  })

  it('延べ面積は、各階の建築面積の合計を㎡で渡す（20m×20m=400㎡ を5階）', () => {
    expect(permitInputFromVolume(block(5), project).totalFloorAreaM2).toBe(2_000)
  })

  it('地上階数は、ボリュームの階数をそのまま渡す', () => {
    expect(permitInputFromVolume(block(5), project).storeys).toBe(5)
  })

  it('ボリュームを変えると、要る図書が変わる（11階・33m で消防と昇降機の図書が加わる）', () => {
    const tall = requiredPermitDocuments(permitInputFromVolume(block(11, 3_000), project)).required
    expect(tall).toEqual(
      expect.arrayContaining([
        '消防用設備等の図書（高層建築物・消防法令）',
        '非常コンセント設備の図（消防法施行令29条の2、地階を除く階数11以上）',
        '非常用の昇降機の図書（法34条2項、高さ31m超）',
      ]),
    )

    const low = requiredPermitDocuments(permitInputFromVolume(block(5, 3_000), project)).required
    expect(low).not.toContain('消防用設備等の図書（高層建築物・消防法令）')
    expect(low).not.toContain('非常用の昇降機の図書（法34条2項、高さ31m超）')
  })

  it('敷地の日影規制区域は、ボリュームの高さと合わせて日影図の要否を決める', () => {
    const inArea = requiredPermitDocuments(
      permitInputFromVolume(block(5), { ...project, inShadowRegulationArea: true }),
    ).required
    expect(inArea).toContain('日影図')
  })
})
