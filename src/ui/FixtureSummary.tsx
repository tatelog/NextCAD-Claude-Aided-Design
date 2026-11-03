// 什器の欄（P4。ハブ A-03 G69、D-04 P3・P4）。P3 で置いた什器を、品目ごとの台数で出す。状態は持たない（入力欄の文字は呼び出し側が持つ）。
// 品目ごとに単価（円/台）の入力欄を置く。単価（0 以上の整数）を入れた品目は、台数 × 単価を、出典なしの仮置きの印（G22）つきで出す。
// 空欄の品目は「単価: 未確定」で、合計に入れない。工事原価（概算）の合計に入れるのは呼び出し側（fixtureCostLines を estimateCost に渡す）。文言は仮置き。
// 区画なし（区画の指定が無い什器と、いまの区画に無い区画の什器）は、落とさず最後の行に数える。金額に入れる台数には区画なしも含める（区画は金額に関係しない）。
import { estimateFixtureCost, parseUnitPrices, type FixtureUnitPriceTexts } from '../estimate/fixtureCost'
import { countFixtures, type Fixture, type FixtureItem } from '../plan/fixtures'

export interface FixtureSummaryProps {
  /** P3 で置いた什器 */
  fixtures: readonly Fixture[]
  /** いま P3 にある区画の id。省略すると、区画の指定が無い什器だけを区画なしに数える */
  unitIds?: readonly string[]
  /** 品目ごとの単価（円/台）の入力欄の文字。省略すると、どの品目も空欄（未確定） */
  unitPriceTexts?: FixtureUnitPriceTexts
  /** 入力欄に文字を入れたときに、品目の id と入れた文字を渡す。省略すると、入力欄は読み取りのみ */
  onUnitPriceChange?: (item: FixtureItem, text: string) => void
}

const HEADING = '什器（P3 で置いたもの）'
const UNPRICED = '単価: 未確定'
const PROVISIONAL_MARK = '未確定（出典なし）'

const yen = (n: number) => `${n.toLocaleString('ja-JP')} 円`

export function FixtureSummary({ fixtures, unitIds, unitPriceTexts, onUnitPriceChange }: FixtureSummaryProps) {
  const counts = countFixtures(fixtures, unitIds)
  const cost = estimateFixtureCost(fixtures, parseUnitPrices(unitPriceTexts))
  return (
    <section aria-label={HEADING} style={{ margin: '0 0 12px' }}>
      <h3 style={{ fontSize: 14, margin: '0 0 4px' }}>{HEADING}</h3>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <tbody>
          {cost.rows.map((r) => (
            <tr key={r.item}>
              <td>{r.label}</td>
              <td align="right">{counts.byItem[r.item]} 台</td>
              <td>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={unitPriceTexts?.[r.item] ?? ''}
                  readOnly={onUnitPriceChange === undefined}
                  onChange={(e) => onUnitPriceChange?.(r.item, e.target.value)}
                  aria-label={`${r.label}の単価（円/台）`}
                  placeholder="円/台"
                  style={{ width: 90, textAlign: 'right', marginRight: 6 }}
                />
                {r.unitPrice === null || r.amount === null ? (
                  <span style={{ color: '#a86b00', fontSize: 11 }}>{UNPRICED}</span>
                ) : (
                  <>
                    <span>{`${r.count} 台 × ${yen(r.unitPrice)} = ${yen(r.amount)}`}</span>
                    {' '}
                    <span style={{ color: '#a86b00', fontSize: 11 }}>{PROVISIONAL_MARK}</span>
                  </>
                )}
              </td>
            </tr>
          ))}
          {counts.unassigned > 0 ? (
            <tr>
              <td>区画なし</td>
              <td align="right">{counts.unassigned} 台</td>
              <td style={{ color: '#666', fontSize: 11 }}>区画の指定が外れたもの（種類は問わない）</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <p style={{ fontSize: 12, color: '#666', margin: '4px 0 0' }}>
        什器は、単価が決まるまで、工事原価（概算）の合計には入れない。単価（円/台）を入れた品目は、台数 × 単価を合計に入れる（出典なしの仮置き）。
      </p>
      {cost.note !== null ? <p style={{ fontSize: 12, color: '#a33', margin: '4px 0 0' }}>{cost.note}</p> : null}
    </section>
  )
}
