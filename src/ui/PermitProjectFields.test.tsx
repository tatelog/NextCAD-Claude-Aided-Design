// 仕様（代表の決定 2026-11-08。出力の画面は Codex の版を正とし、不要な項目は裏側からも片付ける）:
// 仕様 1: 構造は RC、用途は共同住宅に固定し、表示だけにする（AGENTS.md の対象「RC造の板状マンション」）。
// 仕様 2: 昇降機・建築設備・日影規制区域の 3 つは、ほかの画面（各階平面・設備の配置・ボリュームの日影判定）から写して、写し元を添えて表示する。
// 仕様 3: 構造計算・代理申請・BIM 申請・認定部材の 4 つの「はい・いいえ」は出さない（代表 2026-11-08。関わる書類は一覧で要確認のまま残す）。
//         選ぶ欄・文字の入力欄は出さない。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { PermitProject } from '../law/permitInput'
import { usePermitProject } from '../store/permitProject'
import { PermitProjectFields } from './PermitProjectFields'

const render = (project: PermitProject, inherited: Partial<Record<keyof PermitProject, string>> = {}) =>
  renderToStaticMarkup(createElement(PermitProjectFields, { project, inherited }))
const textOf = (html: string) => html.replace(/<[^>]*>/g, '')

describe('出力の申請条件の欄（代表の決定 2026-11-08）', () => {
  it('仕様 1: 構造と用途は表示だけ', () => {
    const html = render(usePermitProject.getState().project)
    expect(html).toContain('構造: RC（このアプリの対象）')
    expect(html).toContain('用途: 共同住宅（同）')
  })

  it('仕様 2: 写した 3 項目は、値と写し元を表示する', () => {
    const project = { ...usePermitProject.getState().project, hasElevator: true, hasBuildingEquipment: true, inShadowRegulationArea: true }
    const text = textOf(render(project, { hasElevator: '保存済みの各階平面', hasBuildingEquipment: '平面の設備配置（積算数量と共通）', inShadowRegulationArea: 'ボリュームの日影規制判定' }))
    expect(text).toContain('昇降機：あり')
    expect(text).toContain('保存済みの各階平面から反映')
    expect(text).toContain('建築設備：あり')
    expect(text).toContain('日影規制区域：あり')
    expect(text).toContain('ボリュームの日影規制判定から反映')
  })

  it('仕様 3: 構造計算・代理申請・BIM 申請・認定部材の質問は出さず、選ぶ欄も文字の入力欄も無い', () => {
    const text = textOf(render(usePermitProject.getState().project))
    for (const word of ['構造計算', '代理者', 'BIM', '認定']) expect(text, word).not.toContain(word)
    const html = render(usePermitProject.getState().project)
    expect(html).not.toContain('<select')
    expect(html).not.toContain('<input')
  })
})
