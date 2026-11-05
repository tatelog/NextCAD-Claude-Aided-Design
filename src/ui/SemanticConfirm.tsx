// 意味づけの確認の欄（ハブ A-03 G13・G14・G65、D-04 共通部品「意味づけの結果表示」「要確認の修正」）。P3 の右パネルの末尾に出す。
// 判断は聞き返さない。結果はそのまま入り、ここで「これでいいか」をまとめて確認する。変えたければ select で選ぶ。いちいち確定させない。
// 件数（未分類・要確認・確定）と、F5・F9 の線の一覧（行数が多いときはスクロール）を出す。各行に、種類を選ぶ select と状態の印。
// 要確認の行には「この種類で確定」を出す（種類を変えずに確定にする）。状態は持たず、値は呼び出し側（店舗）が持つ。文言は仮置き。
// 判定（Claude）は未接続。種類は人が選ぶ。
import { KINDS, type Kind } from '../plan/semantic'
import { countByStatus, kindName, statusName, type ConfirmRow, type ConfirmStatus } from '../plan/semanticConfirm'

export interface SemanticConfirmProps {
  /** 確認欄の行（F5・F9 の線だけ。線の並びのまま） */
  rows: readonly ConfirmRow[]
  /** select で種類を選んだ。未分類を選んだら kind は null（その線の種類を消す） */
  onSelectKind: (segmentId: string, kind: Kind | null) => void
  /** 要確認の行の「この種類で確定」を押した。種類は変えない */
  onConfirm: (segmentId: string, kind: Kind) => void
  /** 欄の見出し。既定は意味づけの確認（G14）。候補の確認（Drawing。G124）は同じ欄の形で見出しだけ変える */
  legend?: string
}

/** 件数を出す順 */
const STATUS_ORDER: readonly ConfirmStatus[] = ['unclassified', 'needs_review', 'confirmed']

/** 一覧の高さの上限（px）。これを超える行数はスクロールする */
const LIST_MAX_HEIGHT_PX = 240

/** 線の id は長い（UUID）ので、見える所は先頭 8 文字だけにする。全体は title に持つ */
const shortId = (id: string): string => id.slice(0, 8)

const note = { color: '#666', fontSize: 12, margin: '0 0 6px' } as const
const countList = { listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 10, padding: 0, margin: '0 0 6px', fontSize: 12 } as const
const list = { listStyle: 'none', padding: 0, margin: 0, fontSize: 12, maxHeight: LIST_MAX_HEIGHT_PX, overflowY: 'auto' } as const
const rowStyle = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, padding: '3px 0', borderBottom: '1px dashed #e6e4dc' } as const
const idLabel = { fontFamily: 'monospace', color: '#444' } as const
const selectStyle = { font: 'inherit', fontSize: 12 } as const
const confirmButton = { font: 'inherit', fontSize: 11, padding: '1px 6px', border: '1px solid #b8b2a4', borderRadius: 4, background: '#fff', color: '#1f2a44', cursor: 'pointer' } as const

const MARK_COLORS: Record<ConfirmStatus, { color: string; background: string }> = {
  unclassified: { color: '#666', background: '#f1efe8' },
  needs_review: { color: '#a33', background: '#fbeceb' },
  confirmed: { color: '#2b6e4a', background: '#e6f2ed' },
}
const statusMark = (s: ConfirmStatus) => ({ ...MARK_COLORS[s], fontSize: 11, padding: '0 6px', borderRadius: 4 }) as const

export function SemanticConfirm({ rows, onSelectKind, onConfirm, legend = '意味づけの確認' }: SemanticConfirmProps) {
  const counts = countByStatus(rows)
  // select の値は、選択肢に出した種類か空（未分類）のどちらか。それ以外は受けない
  const choose = (id: string, value: string) => {
    if (value === '') {
      onSelectKind(id, null)
      return
    }
    const kind = KINDS.find((k) => k === value)
    if (kind !== undefined) onSelectKind(id, kind)
  }
  return (
    <fieldset style={{ border: '1px solid #ddd8cc', padding: 8, margin: '0 0 10px' }}>
      <legend style={{ fontSize: 12 }}>{legend}</legend>
      <p style={note}>判定（Claude）は、ヘッダーの「意味づけを判定」で送る。結果は要確認の提案として入る。種類は人が選ぶ。</p>
      <ul aria-label="意味づけの件数" style={countList}>
        {STATUS_ORDER.map((s) => (
          <li key={s}>
            {statusName(s)} {counts[s]} 件
          </li>
        ))}
      </ul>
      {rows.length === 0 ? (
        <p style={{ ...note, margin: 0 }}>対象の線（F5・F9）がまだありません</p>
      ) : (
        <ul aria-label="意味づけの確認の一覧" style={list}>
          {rows.map((r) => {
            const kind = r.kind
            return (
              <li key={r.id} style={rowStyle}>
                <span title={r.id} style={idLabel}>
                  線 {shortId(r.id)}
                </span>
                <select aria-label={`線 ${shortId(r.id)} の種類`} value={kind ?? ''} onChange={(e) => choose(r.id, e.target.value)} style={selectStyle}>
                  <option value="">{statusName('unclassified')}</option>
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {kindName(k)}
                    </option>
                  ))}
                </select>
                <span style={statusMark(r.status)}>{statusName(r.status)}</span>
                {r.status === 'needs_review' && kind !== null ? (
                  <button type="button" onClick={() => onConfirm(r.id, kind)} style={confirmButton}>
                    この種類で確定
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </fieldset>
  )
}
