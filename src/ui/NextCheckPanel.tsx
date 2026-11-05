// 次へを押したときの確かめの一覧（代表の決定 G158: 止めない。直すか、このまま進むかを利用者が選ぶ）。P2・P3・P4 で同じ形を使う。
// 文言は、確かめの関数（plan/nextCheck）が決めたものをそのまま出す。ここでは並べて、二つのボタンを置くだけ。
import type { CheckIssue } from '../plan/nextCheck'

export interface NextCheckPanelProps {
  issues: readonly CheckIssue[]
  /** 「このまま進む」の文言（要確認として残すことを言う） */
  goLabel: string
  /** 「この画面で直す」: 一覧を閉じて、この画面に残る */
  onStay: () => void
  /** 「このまま進む」: 問題を作業ログに残して、次の画面へ */
  onGoAnyway: () => void
}

export function NextCheckPanel({ issues, goLabel, onStay, onGoAnyway }: NextCheckPanelProps) {
  return (
    <div role="alert" style={{ marginTop: 8, padding: 8, border: '1px solid #c8a04a', borderRadius: 4, background: '#fffaf0', fontSize: 12 }}>
      <p style={{ margin: '0 0 4px' }}>次へ進む前に、{issues.length} 件を確かめてください。</p>
      <ul style={{ margin: '0 0 6px', paddingLeft: 16 }}>
        {issues.map((i, k) => (
          <li key={k}>
            {i.area}: {i.text}
          </li>
        ))}
      </ul>
      <button type="button" onClick={onStay}>
        この画面で直す
      </button>{' '}
      <button type="button" onClick={onGoAnyway}>
        {goLabel}
      </button>
    </div>
  )
}
