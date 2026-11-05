import { describe, expect, it } from 'vitest'
import { extrudeVolume } from '../volume/extrude'
import { permitInputFromVolume, type PermitProject } from './permitInput'
import { requiredPermitDocuments } from './permitRequired'

// 仕様（ユーザー指示 2026-11-04「条件はボリュームしだい。そこは可変する条件として」）から書いたテスト。
// 高さ・階数・延べ面積は、ボリュームの値から毎回決まる。敷地と案件の条件（日影規制区域・構造など）は別に入れる。

const project: PermitProject = {
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

  // 仕様（統括の指示 2026-11-06。AGENTS.md の対象「RC造の板状マンション」）: 構造と用途は案件の入力に持たず、判定の入力は常に RC・共同住宅。
  it('構造と用途は案件の入力に無く、判定の入力は常に RC・共同住宅になる', () => {
    const input = permitInputFromVolume(block(5), project)
    expect(input.structure).toBe('RC')
    expect(input.usage).toBe('共同住宅')
  })

  it('地上階数は、ボリュームの階数をそのまま渡す', () => {
    expect(permitInputFromVolume(block(5), project).storeys).toBe(5)
  })

  it('ボリュームを変えると、要る図書が変わる（11階・33m で非常コンセントの図が加わる。消防用設備等は高さでなく延べ面積で決まる）', () => {
    const tall = requiredPermitDocuments(permitInputFromVolume(block(11, 3_000), project)).required
    expect(tall).toEqual(
      expect.arrayContaining([
        '消防用設備等の図書（消防法17条・表二(六十七)）',
        '非常コンセント設備の図（消防法施行令29条の2、地階を除く階数11以上）',
        // 非常用の昇降機は 31m 超の部分の床面積で決まる（下のテスト）
      ]),
    )

    // 5階・延べ面積2000㎡でも消防用設備等の図書は要る（施行令10条1項2号イ）。非常コンセントは11階以上なので要らない
    const low = requiredPermitDocuments(permitInputFromVolume(block(5, 3_000), project)).required
    expect(low).toContain('消防用設備等の図書（消防法17条・表二(六十七)）')
    expect(low).not.toContain('非常コンセント設備の図（消防法施行令29条の2、地階を除く階数11以上）')
    expect(low).not.toContain('非常用の昇降機の図書（法34条2項、高さ31m超）')
  })

  it('31m超の部分の床面積は、高さ31mを超える階の床面積の合計（11階・3m は1階分の400㎡）', () => {
    expect(permitInputFromVolume(block(11, 3_000), project).areaAbove31M2).toBe(400)
    expect(permitInputFromVolume(block(5), project).areaAbove31M2).toBe(0)
  })

  // 仕様（代表の指示 2026-11-06。施行令129条の13の2 第2号・第3号）: 31mの線を少しでも超える階（またぐ階）も「高さ31mを超える部分」の階に数える。
  // 床面積（第2号）も階数（第3号）も同じ。条文には書いていない実務の扱い。
  it('31mをまたぐ階も31m超の部分に数える（階高3.5mの12階は、9階＝床28.0m・上端31.5mを含む9〜12階の4階分）', () => {
    const input = permitInputFromVolume(block(12, 3_500), project)
    expect(input.storeysAbove31).toBe(4)
    expect(input.areaAbove31M2).toBe(1_600)
    expect(permitInputFromVolume(block(5), project).storeysAbove31).toBe(0)
  })

  it('31m超の部分の階数が5以上（階高3.5mの13階）なら、第3号に当たらず非常用の昇降機の図書が要る', () => {
    const r = requiredPermitDocuments(permitInputFromVolume(block(13, 3_500), project))
    expect(r.required).toContain('非常用の昇降機の図書（法34条2項、高さ31m超）')
  })

  it('31m超の部分の階数が4以下（階高3.5mの12階）なら、第3号の耐火構造・区画の入力待ちで要確認', () => {
    const r = requiredPermitDocuments(permitInputFromVolume(block(12, 3_500), project))
    expect(r.required).not.toContain('非常用の昇降機の図書（法34条2項、高さ31m超）')
    expect(r.needsCheck.find((n) => n.name === '非常用の昇降機の図書（法34条2項、高さ31m超）')?.reason).toContain('第3号')
  })

  // 仕様（代表の指示 2026-11-06）: 階数・面積で変わる図書は、勝手に対象から外さず、要確認と同じ扱いにする。
  it('11階・3m（31m超の部分は1階分の400㎡）は政令の除外に当たるが、要らないとは決めず要確認に残す', () => {
    const r = requiredPermitDocuments(permitInputFromVolume(block(11, 3_000), project))
    expect(r.required).not.toContain('非常用の昇降機の図書（法34条2項、高さ31m超）')
    expect(r.notRequired.map((n) => n.name)).not.toContain('非常用の昇降機の図書（法34条2項、高さ31m超）')
    expect(r.needsCheck.map((n) => n.name)).toContain('非常用の昇降機の図書（法34条2項、高さ31m超）')
  })

  it('5階のボリュームでも、非常コンセント・連結送水管・日影図は要らないとは決めず、要確認に残す', () => {
    const r = requiredPermitDocuments(permitInputFromVolume(block(5), project))
    for (const name of [
      '非常コンセント設備の図（消防法施行令29条の2、地階を除く階数11以上）',
      '連結送水管の図（消防法施行令29条）',
      '日影図',
    ]) {
      expect(r.notRequired.map((n) => n.name)).not.toContain(name)
      expect(r.needsCheck.map((n) => n.name)).toContain(name)
    }
  })

  // 31m超の部分の階数が6（4を超える）ので、第3号（階数4以下）にも当たらない（代表の指示 2026-11-06 で第3号の階数を判定に使う）
  it('15階・3.2m（31m超の部分は6階分の2400㎡）は、第2号にも第3号にも当たらないので、非常用の昇降機の図書が要る', () => {
    const r = requiredPermitDocuments(permitInputFromVolume(block(15, 3_200), project))
    expect(r.required).toContain('非常用の昇降機の図書（法34条2項、高さ31m超）')
  })

  it('敷地の日影規制区域は、ボリュームの高さと合わせて日影図の要否を決める', () => {
    const inArea = requiredPermitDocuments(
      permitInputFromVolume(block(5), { ...project, inShadowRegulationArea: true }),
    ).required
    expect(inArea).toContain('日影図')
  })
})
