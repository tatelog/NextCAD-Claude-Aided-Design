// 仕様（B: アプリも Cloudflare に上げる。.env を置かずに Worker を呼ぶ）: 判定の送り先（Worker の URL）を次のように決める。
// 仕様 1: 設定（VITE_WORKER_URL）があれば、それを使う（前後の空白は除く）。
// 仕様 2: 設定が無く、本番（配備したアプリ）なら、アプリと同じ場所（origin）を使う。Worker がアプリも配るので、URL を置かずに済む。
// 仕様 3: 設定が無く、開発（手元の開発サーバー）なら、空（送れない）。手元の開発では、設定を置いた場合だけ送る。
// 仕様 4: 設定が空の空白だけなら、無いのと同じに扱う。
import { describe, expect, it } from 'vitest'
import { workerUrlFor } from './workerUrl'

describe('判定の送り先（Worker の URL）', () => {
  it('設定があれば、それを使う（空白は除く）', () => {
    expect(workerUrlFor({ configured: ' https://w.example.invalid ', origin: 'https://app.example.invalid', prod: true })).toBe('https://w.example.invalid')
  })

  it('設定が無く本番なら、アプリと同じ場所（origin）を使う', () => {
    expect(workerUrlFor({ configured: undefined, origin: 'https://app.example.invalid', prod: true })).toBe('https://app.example.invalid')
  })

  it('設定が無く開発なら、空（送れない）', () => {
    expect(workerUrlFor({ configured: undefined, origin: 'http://localhost:5174', prod: false })).toBe('')
  })

  it('設定が空白だけなら、無いのと同じ', () => {
    expect(workerUrlFor({ configured: '   ', origin: 'https://app.example.invalid', prod: true })).toBe('https://app.example.invalid')
    expect(workerUrlFor({ configured: '   ', origin: 'http://localhost:5174', prod: false })).toBe('')
  })
})
