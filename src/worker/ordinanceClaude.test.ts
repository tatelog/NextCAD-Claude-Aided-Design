// 仕様（ハブ A-03 G15・D-02 C4「条例の補完（W4）」・C12 の中継）:
// 仕様 W1: 送るのは、自治体名・用途地域・条例本文の抜粋。本文だけを根拠にさせ、本文に無い値を出させない。モデルは claude-haiku-5-5。ツールを強制する。
// 仕様 W2: 返ってきた項目は、acceptSuggestions の検査を通ったものだけを返す。捨てた数も返す。
// 仕様 W3: 失敗したら 1 回だけ再試行し、それでも失敗したら保留（PENDING）として返す。
// 仕様 W4: キーが無ければ、Claude を呼ばずに失敗する（設定の誤り）。
import { describe, expect, it } from 'vitest'
import { PENDING } from './classify'
import { suggestOrdinance } from './ordinanceClaude'
import { SHADOW_KEYS } from '../law/shadowOrdinance'

type Call = { url: string; init: RequestInit }

function toolResponse(items: unknown): Response {
  return new Response(JSON.stringify({ content: [{ type: 'tool_use', name: 'suggest_ordinance', input: { items } }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

const input = { city: '東京都江東区', zone: '住居系' as const, text: '日影による中高層の建築物の高さの制限（別表）…' }

describe('W1: 送る内容とモデル', () => {
  it('Claude の API に、本文だけを根拠にする指示とツールの強制を付けて送る', async () => {
    const calls: Call[] = []
    const fetchImpl = async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return toolResponse([])
    }
    await suggestOrdinance(input, { ANTHROPIC_API_KEY: 'test-key' }, fetchImpl)
    expect(calls).toHaveLength(1)
    const body = JSON.parse(String(calls[0]!.init.body))
    expect(body.model).toBe('claude-haiku-5-5')
    expect(body.tool_choice).toEqual({ type: 'tool', name: 'suggest_ordinance' })
    expect(JSON.stringify(body.messages)).toContain('東京都江東区')
    expect(JSON.stringify(body.messages)).toContain('本文に書かれていない')
  })
})

describe('W2: 返す項目は検査を通ったものだけ', () => {
  it('出典の無い項目と、名前の違う項目は返さず、捨てた数を返す', async () => {
    const fetchImpl = async () =>
      toolResponse([
        { item: SHADOW_KEYS.near, value: '4時間', source: '東京都条例 別表' },
        { item: SHADOW_KEYS.far, value: '2.5時間', source: '' },
        { item: '別の項目', value: '1', source: '条例' },
      ])
    const r = await suggestOrdinance(input, { ANTHROPIC_API_KEY: 'test-key' }, fetchImpl)
    expect(r).toEqual({ accepted: [{ key: SHADOW_KEYS.near, value: '4時間', source: '東京都条例 別表' }], dropped: 2 })
  })
})

describe('W3: 失敗は 1 回だけ再試行し、保留にする', () => {
  it('二回とも失敗したら PENDING の例外になり、呼び出しは二回', async () => {
    let n = 0
    const fetchImpl = async () => {
      n++
      return new Response('server error', { status: 500 })
    }
    await expect(suggestOrdinance(input, { ANTHROPIC_API_KEY: 'test-key' }, fetchImpl)).rejects.toMatchObject({ code: PENDING })
    expect(n).toBe(2)
  })
})

describe('W4: キーが無ければ呼ばない', () => {
  it('キーが無いと、API を呼ばずに失敗する', async () => {
    let n = 0
    const fetchImpl = async () => {
      n++
      return toolResponse([])
    }
    await expect(suggestOrdinance(input, {}, fetchImpl)).rejects.toThrow()
    expect(n).toBe(0)
  })
})
