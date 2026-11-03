// 条例の値の入力と確認（ハブ A-03 G15）。値と出典を人が入れ、人が確認する。確認済みの値だけが判定に使われる。
import { useState } from 'react'
import { ordinanceStatus } from '../law/ordinance'
import { SHADOW_KEYS } from '../law/shadowOrdinance'
import { ZONES, type Zone } from '../law/slopeRules'
import { useOrdinance } from '../store/ordinance'
import { appWorkerUrl } from '../worker/workerUrl'
import { suggestOrdinanceViaWorker } from '../worker/ordinanceClient'

/** 条例の値の項目（日影の条件など）。項目の名前は、判定の側と揃える */
export const ORDINANCE_KEYS = [SHADOW_KEYS.near, SHADOW_KEYS.far, SHADOW_KEYS.height] as const

/** 項目の状態を 1 行で出す（判定の側に置く） */
export function OrdinanceStatusLine({ itemKey }: { itemKey: string }) {
  const entries = useOrdinance((s) => s.entries)
  const s = ordinanceStatus(entries, itemKey)
  const text = s.status === '未入力' ? '未入力' : s.status === '未確認' ? `${s.value}（未確認）` : `${s.value}（確認済み）`
  return (
    <span style={{ color: s.status === '確認済み' ? undefined : '#a86b00' }}>
      条例の{itemKey}: {text}
    </span>
  )
}

/** 条例本文から、日影の規制値を Claude（W4）で補う。補った値は未確認のまま入る。人が確認するまで判定には使わない */
function OrdinanceSuggest() {
  const setEntry = useOrdinance((s) => s.setEntry)
  const [city, setCity] = useState('')
  const [zone, setZone] = useState<Zone>('住居系')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const workerUrl = appWorkerUrl()
  const run = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const r = await suggestOrdinanceViaWorker({ city: city.trim(), zone, text }, workerUrl, (url, init) => fetch(url, init))
      for (const s of r.accepted) setEntry(s.key, s.value, s.source)
      setMessage(`補った ${r.accepted.length} 件（未確認）。捨てた ${r.dropped} 件（出典なし・数でない・項目違い）`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }
  const ready = workerUrl.trim() !== '' && city.trim() !== '' && text.trim() !== '' && !busy
  return (
    <div style={{ display: 'grid', gap: 4, margin: '10px 0', fontSize: 12, borderTop: '1px dashed #ddd8cc', paddingTop: 8 }}>
      <span>Claude で条例本文から補う（W4。補った値は未確認。人が確認する）</span>
      {workerUrl.trim() === '' && <span style={{ color: '#a33' }}>Worker の URL が未設定のため、送れない（開発は VITE_WORKER_URL が要る）</span>}
      <input aria-label="自治体名" placeholder="自治体名（例: 東京都江東区）" value={city} onChange={(e) => setCity(e.target.value)} />
      <select aria-label="用途地域" value={zone} onChange={(e) => setZone(e.target.value as Zone)}>
        {ZONES.map((z) => (
          <option key={z} value={z}>
            {z}
          </option>
        ))}
      </select>
      <textarea
        aria-label="条例本文の抜粋"
        placeholder="条例本文の抜粋を貼る（2000 字まで）"
        maxLength={2000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ minHeight: 80 }}
      />
      <div>
        <button type="button" onClick={run} disabled={!ready}>
          {busy ? '補っています…' : '条例本文から補う'}
        </button>
      </div>
      {message && <span>{message}</span>}
    </div>
  )
}

/** 入力と確認の欄（項目ごと）。確認は出典が空のままではできない */
export function OrdinanceForm() {
  const entries = useOrdinance((s) => s.entries)
  const setEntry = useOrdinance((s) => s.setEntry)
  const confirm = useOrdinance((s) => s.confirm)
  const [drafts, setDrafts] = useState<Record<string, { value: string; source: string }>>({})
  return (
    <section style={{ marginBottom: 10 }}>
      <strong style={{ fontSize: 13 }}>条例の値（人が入力し、出典を付けて確認する。G15）</strong>
      {ORDINANCE_KEYS.map((key) => {
        const draft = drafts[key] ?? { value: '', source: '' }
        const status = ordinanceStatus(entries, key)
        return (
          <div key={key} style={{ display: 'grid', gap: 4, margin: '6px 0', fontSize: 12 }}>
            <span>
              {key}（現在: {status.status}）
            </span>
            <input aria-label={`${key}の値`} placeholder="値" value={draft.value} onChange={(e) => setDrafts({ ...drafts, [key]: { ...draft, value: e.target.value } })} />
            <input aria-label={`${key}の出典`} placeholder="出典（条例名と条項）" value={draft.source} onChange={(e) => setDrafts({ ...drafts, [key]: { ...draft, source: e.target.value } })} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={() => setEntry(key, draft.value, draft.source)} disabled={draft.value.trim() === ''}>
                入れる
              </button>
              <button type="button" onClick={() => confirm(key)} disabled={status.status === '未入力' || status.status === '確認済み'}>
                人が確認した
              </button>
            </div>
          </div>
        )
      })}
      <OrdinanceSuggest />
    </section>
  )
}
