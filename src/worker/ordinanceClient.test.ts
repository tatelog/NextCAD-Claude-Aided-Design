// 仕様（ハブ A-03 G15・D-02 C4「条例の補完（W4）」・C12）: 画面から Worker の /ordinance へ、条例本文を送り、検査を通った項目を受け取る。
// 仕様 C1: URL の末尾の / は一つにまとめ、/ordinance へ POST する。送るのは自治体・用途地域・本文。
// 仕様 C2: 結果の項目と、捨てた数を返す。
// 仕様 C3: 保留（503）は、保留だと分かる失敗にする。ほかの失敗は、Worker の失敗として返す。
// 仕様 C4: Worker の URL が空なら、送らずに失敗する。
import { describe, expect, it } from 'vitest'
import { suggestOrdinanceViaWorker } from './ordinanceClient'
import { SHADOW_KEYS } from '../law/shadowOrdinance'

const req = { city: '東京都江東区', zone: '住居系', text: '条例本文の抜粋' }

describe('W4 の呼び出し（仕様 C1・C2）', () => {
  it('末尾の / を一つにまとめて /ordinance へ送り、項目と捨てた数を返す', async () => {
    const calls: { url: string; body: string }[] = []
    const fetchImpl = async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) })
      return new Response(JSON.stringify({ accepted: [{ key: SHADOW_KEYS.near, value: '4時間', source: '条例 別表' }], dropped: 1 }), { status: 200 })
    }
    const r = await suggestOrdinanceViaWorker(req, 'https://worker.example.dev//', fetchImpl)
    expect(calls[0]!.url).toBe('https://worker.example.dev/ordinance')
    expect(JSON.parse(calls[0]!.body)).toEqual(req)
    expect(r).toEqual({ accepted: [{ key: SHADOW_KEYS.near, value: '4時間', source: '条例 別表' }], dropped: 1 })
  })
})

describe('失敗の表し方（仕様 C3・C4）', () => {
  it('503 は保留と分かる失敗', async () => {
    const fetchImpl = async () => new Response('{}', { status: 503 })
    await expect(suggestOrdinanceViaWorker(req, 'https://worker.example.dev', fetchImpl)).rejects.toThrow('保留')
  })

  it('それ以外の失敗は、Worker の失敗として返す', async () => {
    const fetchImpl = async () => new Response('{}', { status: 500 })
    await expect(suggestOrdinanceViaWorker(req, 'https://worker.example.dev', fetchImpl)).rejects.toThrow('Worker が失敗: 500')
  })

  it('Worker の URL が空なら、送らずに失敗する', async () => {
    let n = 0
    const fetchImpl = async () => {
      n++
      return new Response('{}', { status: 200 })
    }
    await expect(suggestOrdinanceViaWorker(req, '  ', fetchImpl)).rejects.toThrow('Worker の URL が空')
    expect(n).toBe(0)
  })
})
