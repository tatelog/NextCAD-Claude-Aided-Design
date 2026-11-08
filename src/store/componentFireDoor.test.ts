import { beforeEach, describe, expect, it } from 'vitest'
import { useComponentFire } from './componentFire'

// 仕様（ハブ A-03 G85）から書いたテスト。外壁開口部設備が防火設備かの入力を、部材の耐火時間と同じ箱（画面の中だけ）で持つ。
// - 入力が無いときは null（未入力。イの判定は判定不能になる）。
// - 防火設備かどうかは、true（防火設備）か false（防火設備ではない）か null（未入力）。
// - reset で部材の耐火時間と合わせて未入力に戻る。

beforeEach(() => {
  useComponentFire.getState().reset()
})

describe('外壁開口部設備（防火設備か）の入力', () => {
  it('既定は未入力（null）', () => {
    expect(useComponentFire.getState().fireDoor).toBeNull()
  })

  it('防火設備（true）と、防火設備ではない（false）を入れられる', () => {
    useComponentFire.getState().setFireDoor(true)
    expect(useComponentFire.getState().fireDoor).toBe(true)
    useComponentFire.getState().setFireDoor(false)
    expect(useComponentFire.getState().fireDoor).toBe(false)
  })

  it('null で未入力に戻せる', () => {
    useComponentFire.getState().setFireDoor(true)
    useComponentFire.getState().setFireDoor(null)
    expect(useComponentFire.getState().fireDoor).toBeNull()
  })

  it('reset で部材の耐火時間と一緒に未入力に戻る', () => {
    useComponentFire.getState().setFireDoor(true)
    useComponentFire.getState().setRating('柱', 90)
    useComponentFire.getState().reset()
    expect(useComponentFire.getState().fireDoor).toBeNull()
    expect(useComponentFire.getState().ratings).toEqual({})
  })
})
