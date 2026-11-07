import { expect, it } from 'vitest'
import { topViewAt } from './topView'

it('ダブルクリック地点を中心に、北を上・真上・初期比4倍にする', () => {
  expect(topViewAt(139.8, 35.6, 14)).toEqual({ center: [139.8, 35.6], zoom: 16, pitch: 0, bearing: 0 })
})
