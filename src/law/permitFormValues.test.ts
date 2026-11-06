import { describe, expect, it } from 'vitest'
import formsJson from './permitForms.json'
import { formValuesFromVolume } from './permitFormValues'
import { extrudeVolume } from '../volume/extrude'

// 仕様（t31: ボリュームから第二号様式・第三号様式の数値欄に入れる。permitForms.json の欄 ID に従う）から書いたテスト。
// - 建築面積・延べ面積・高さ・階数はボリュームの値から入る（出典はボリューム）。
// - 構造は案件の入力（出典は案件）。敷地面積はボリュームからは取らない（入力があるときだけ入る）。
// - 入れた値の欄 ID は、欄の一覧（permitForms.json）に存在する。

// 20 m × 20 m の外形（反時計回り、mm）を階数分押し出す
function block(storeys: number, storeyHeight = 3_200) {
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

const project = { structure: 'RC' }

describe('ボリュームから入る記入値（t31）', () => {
  it('建築面積と延べ面積は、ボリュームの値から㎡で入る（20m×20m=400㎡、5階で延べ2000㎡）', () => {
    const v = formValuesFromVolume(block(5), project)
    expect(v['F2-3-10']).toEqual({ value: '400.00', from: 'ボリューム' })
    expect(v['F2-3-11']).toEqual({ value: '2000.00', from: 'ボリューム' })
  })

  it('高さは階数×階高をメートルで入る（5階×3.2m=16.00m）', () => {
    const v = formValuesFromVolume(block(5), project)
    expect(v['F2-4-09.最高の高さ']).toEqual({ value: '16.00', from: 'ボリューム' })
  })

  it('地上階数はボリュームの階数をそのまま入る', () => {
    const v = formValuesFromVolume(block(5), project)
    expect(v['F2-4-08']).toEqual({ value: '5', from: 'ボリューム' })
  })

  it('構造は案件の入力から入り、出典は案件（造の前に入る文字は「鉄筋コンクリート」）', () => {
    const v = formValuesFromVolume(block(5), project)
    expect(v['F2-4-04']).toEqual({ value: '鉄筋コンクリート', from: '案件' })
  })

  it('敷地面積は、入力が無いときは入らない（ボリュームからは取らない）', () => {
    const v = formValuesFromVolume(block(5), project)
    expect(v['F2-3-07.敷地面積']).toBeUndefined()
  })

  it('敷地面積の入力があれば、㎡で入る', () => {
    const v = formValuesFromVolume(block(5), { ...project, siteAreaM2: 1_200 })
    expect(v['F2-3-07.敷地面積']).toEqual({ value: '1200.00', from: '公図の参考値' })
  })

  it('ボリュームを変えると、入る値も変わる（11階にすると高さと延べ面積が変わる）', () => {
    const v = formValuesFromVolume(block(11, 3_000), project)
    expect(v['F2-4-09.最高の高さ']?.value).toBe('33.00')
    expect(v['F2-3-11']?.value).toBe('4400.00')
  })

  it('入れた値はすべて、出典（ボリュームか案件）を持つ', () => {
    const v = formValuesFromVolume(block(5), { ...project, siteAreaM2: 1_200 })
    for (const entry of Object.values(v)) {
      expect(['ボリューム', '案件', '公図', '公図の参考値']).toContain(entry.from)
    }
  })

  it('入れた値の欄 ID は、欄の一覧（第二号様式・第三号様式）に存在する', () => {
    const forms = formsJson.forms as { faces: { fields: { id: string }[] }[] }[]
    const ids = new Set(forms.flatMap((f) => f.faces.flatMap((face) => face.fields.map((x) => x.id))))
    const v = formValuesFromVolume(block(5), { ...project, siteAreaM2: 1_200 })
    for (const key of Object.keys(v)) {
      const base = key.split('.')[0]!
      expect(ids.has(base), key).toBe(true)
    }
  })
})
