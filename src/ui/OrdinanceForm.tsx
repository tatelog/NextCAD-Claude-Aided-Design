// 条例の値の入力と確認（ハブ A-03 G15）。値と出典を人が入れ、人が確認する。確認済みの値だけが判定に使われる。
import { useState } from 'react'
import { ordinanceStatus } from '../law/ordinance'
import { useOrdinance } from '../store/ordinance'

/** 条例の値の項目（日影の条件など）。項目の名前は、判定の側と揃える */
export const ORDINANCE_KEYS = ['日影時間', '測定面の高さ'] as const

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
    </section>
  )
}
