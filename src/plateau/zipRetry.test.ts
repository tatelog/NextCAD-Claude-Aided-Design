// 仕様（統括の依頼 2026-11-06。A: 周辺建物の範囲取得が、一時の失敗で止まらないように）:
// 仕様 A1: 応答の本文が途中で切れた（content-range の長さと合わない）ときは、同じ範囲をもう一度取る。
// 仕様 A2: 中継が 502 などを返したときは、同じ範囲をもう一度取る。
// 仕様 A3: 何度取り直しても取れないときは、回数を含めて知らせる（黙って止めない）。
// 仕様 A4: 接続そのものの失敗（TypeError）は、最後まで TypeError のまま投げる（既存の文言の変換を保つ）。
import { describe, expect, it } from 'vitest'
import { openZip } from './zipRange'
import { buildZip, type FixtureFile } from './zipFixture'

const files: FixtureFile[] = [{ name: 'udx/bldg/53394603_bldg_6697_op.gml', data: new TextEncoder().encode('building '.repeat(100)) }]
const zip = buildZip(files)

// 最初の faults.length 回は、指定どおりに壊れた応答を返す（'truncate' は本文を半分にする。502 は中継の失敗）。以後は正しく返す
function faulty(faults: (number | 'truncate')[]): typeof fetch {
  let call = 0
  return (async (_url: string | URL | Request, init?: RequestInit) => {
    const headers = init?.headers as Record<string, string>
    const range = headers.Range ?? headers.range ?? ''
    const suffix = /^bytes=-(\d+)$/.exec(range)
    const span = /^bytes=(\d+)-(\d+)$/.exec(range)
    const start = suffix ? Math.max(0, zip.length - Number(suffix[1])) : Number(span![1])
    const end = suffix ? zip.length - 1 : Math.min(Number(span![2]), zip.length - 1)
    const fault = faults[call++]
    if (fault === 502) return new Response('Bad Gateway', { status: 502 })
    const body = new Uint8Array(zip.subarray(start, end + 1))
    const sent = fault === 'truncate' ? body.subarray(0, Math.floor(body.length / 2)) : body
    return new Response(sent, { status: 206, headers: { 'content-range': `bytes ${start}-${end}/${zip.length}` } })
  }) as typeof fetch
}

describe('範囲取得の一時の失敗（仕様 A1〜A4）', () => {
  it('仕様 A1: 応答の本文が途中で切れたら、もう一度取って読める', async () => {
    const z = await openZip('https://example.test/ward.zip', faulty(['truncate']))
    expect(z.entries.map((e) => e.name)).toEqual(files.map((f) => f.name))
  })

  it('仕様 A2: 中継が 502 を返したら、もう一度取って読める', async () => {
    const z = await openZip('https://example.test/ward.zip', faulty([502]))
    expect(z.entries.length).toBe(1)
  })

  it('仕様 A3: 何度取り直しても取れないときは、回数を含めて知らせる', async () => {
    await expect(openZip('https://example.test/ward.zip', faulty([502, 502, 502, 502, 502, 502]))).rejects.toThrow('3 回')
  })

  it('仕様 A4: 接続そのものの失敗は、最後まで TypeError のまま投げる', async () => {
    const offline = (async () => {
      throw new TypeError('Failed to fetch')
    }) as typeof fetch
    await expect(openZip('https://example.test/ward.zip', offline)).rejects.toBeInstanceOf(TypeError)
  })
})
