// 仕様（ハブ A-03 G75。1F の共用部の名前は案件のファイルに入る）: 区画に付けた 1F の名前を、保存と読み込みで戻す。
// 仕様 1: 名前が付いた区画があれば、保存のデータに firstFloorNames として入る。無ければ項目ごと付けない。
// 仕様 2: 読み込みで、保存された名前が戻る。名前の無い古い保存も読める（空）。
// 仕様 3: 名前が文字（string）でなければ、読み込みで弾く。
import { beforeEach, describe, expect, it } from 'vitest'
import { buildSaveData } from './saveData'
import { applyLoadedProject, parseSaveData } from './loadData'
import { useFirstFloor } from '../store/firstFloor'

const base = { projectName: '試し', entries: [], storeyCount: 3, storeyHeightMm: 3000, savedAt: new Date('2026-11-04T00:00:00.000Z') }

beforeEach(() => useFirstFloor.getState().reset())

describe('1F の名前の保存と読み込み（仕様 1〜3）', () => {
  it('仕様 1: 名前が付いた区画があれば保存に入り、無ければ項目ごと付けない', () => {
    const data = buildSaveData({ ...base, firstFloorNames: { 'cell-1': 'エントランス' } })
    expect(data.firstFloorNames).toEqual({ 'cell-1': 'エントランス' })
    expect(buildSaveData(base)).not.toHaveProperty('firstFloorNames')
  })

  it('仕様 2: 読み込みで名前が戻る。名前の無い古い保存は空。読み込みで画面にも入る', () => {
    const saved = JSON.parse(JSON.stringify(buildSaveData({ ...base, firstFloorNames: { 'cell-1': 'ロビー' } })))
    expect(parseSaveData(saved).firstFloorNames).toEqual({ 'cell-1': 'ロビー' })
    expect(parseSaveData(JSON.parse(JSON.stringify(buildSaveData(base)))).firstFloorNames).toEqual({})
    applyLoadedProject(parseSaveData(saved))
    expect(useFirstFloor.getState().names).toEqual({ 'cell-1': 'ロビー' })
  })

  it('仕様 3: 名前が文字でなければ、読み込みで弾く', () => {
    const bad = JSON.parse(JSON.stringify(buildSaveData(base)))
    bad.firstFloorNames = { 'cell-1': 3 }
    expect(() => parseSaveData(bad)).toThrow()
  })
})
