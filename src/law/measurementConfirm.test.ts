import { beforeEach, describe, expect, it, vi } from 'vitest'
import { confirmMeasurement } from './measurementConfirm'
import { SHADOW_KEYS } from './shadowOrdinance'
import { ordinanceStatus } from './ordinance'
import { useOrdinance } from '../store/ordinance'

// 仕様（ハブ A-03 G87。統括の決定 2026-11-04、A-03 版 48）から書いたテスト。
// - 判定に使う測定面は、表から出た候補を自動では使わない。人が「確定」した値だけを条例の値として使う（G15 と同じ扱い）。
// - 候補の確定は、測定面の条例の値に候補の m を入れ、出典を付けて確認済みにする。
// - 候補が決まっていなければ、何もしない（判定は「未確定」のまま）。

beforeEach(() => {
  useOrdinance.setState({ entries: [] })
})

describe('測定面の候補の確定（G87）', () => {
  it('候補（4m・別表第一 一）を確定すると、測定面の値に 4 が入り、出典を付けて確認を取る', () => {
    const act = { setEntry: vi.fn(), confirm: vi.fn() }
    const ok = confirmMeasurement({ ok: true, measurement: { measurementM: 4, band: '一' } }, act)
    expect(ok).toBe(true)
    expect(act.setEntry).toHaveBeenCalledWith(SHADOW_KEYS.height, '4', expect.stringContaining('別表第一（一）'))
    expect(act.confirm).toHaveBeenCalledWith(SHADOW_KEYS.height)
  })

  it('6.5m の候補は、値 6.5 として入る', () => {
    const act = { setEntry: vi.fn(), confirm: vi.fn() }
    confirmMeasurement({ ok: true, measurement: { measurementM: 6.5, band: '二' } }, act)
    expect(act.setEntry).toHaveBeenCalledWith(SHADOW_KEYS.height, '6.5', expect.stringContaining('別表第一（二）'))
  })

  it('候補が決まっていなければ（ok でない）何もしない', () => {
    const act = { setEntry: vi.fn(), confirm: vi.fn() }
    const ok = confirmMeasurement({ ok: false, reason: '高度地区の区分が未入力' }, act)
    expect(ok).toBe(false)
    expect(act.setEntry).not.toHaveBeenCalled()
    expect(act.confirm).not.toHaveBeenCalled()
  })

  it('確定した値は、条例の状態で「確認済み」になる（判定に使える）', () => {
    confirmMeasurement({ ok: true, measurement: { measurementM: 4, band: '一' } }, useOrdinance.getState())
    const s = ordinanceStatus(useOrdinance.getState().entries, SHADOW_KEYS.height)
    expect(s).toEqual({ status: '確認済み', value: '4' })
  })

  it('候補を確定していなければ、測定面は未入力のまま（判定は判定不能）', () => {
    confirmMeasurement({ ok: false, reason: '容積率が未取得' }, useOrdinance.getState())
    expect(ordinanceStatus(useOrdinance.getState().entries, SHADOW_KEYS.height).status).toBe('未入力')
  })
})
