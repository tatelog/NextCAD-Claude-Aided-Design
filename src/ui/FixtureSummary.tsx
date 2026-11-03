// 什器の欄（P4。ハブ A-03 G69、D-04 P3・P4）。P3 で置いた什器を、品目ごとの台数で出す。単価は未確定。状態は持たない。
// 什器は、単価が決まるまで、工事原価（概算）の合計に入れない（estimateCost には渡さない）。文言は仮置き。
// 区画なし（区画の指定が無い什器と、いまの区画に無い区画の什器）は、落とさず最後の行に数える。
import { FIXTURE_ITEMS, countFixtures, type Fixture } from '../plan/fixtures'

export interface FixtureSummaryProps {
  /** P3 で置いた什器 */
  fixtures: readonly Fixture[]
  /** いま P3 にある区画の id。省略すると、区画の指定が無い什器だけを区画なしに数える */
  unitIds?: readonly string[]
}

const HEADING = '什器（P3 で置いたもの）'
const UNPRICED = '単価: 未確定'

export function FixtureSummary({ fixtures, unitIds }: FixtureSummaryProps) {
  const counts = countFixtures(fixtures, unitIds)
  return (
    <section aria-label={HEADING} style={{ margin: '0 0 12px' }}>
      <h3 style={{ fontSize: 14, margin: '0 0 4px' }}>{HEADING}</h3>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <tbody>
          {FIXTURE_ITEMS.map((i) => (
            <tr key={i.id}>
              <td>{i.label}</td>
              <td align="right">{counts.byItem[i.id]} 台</td>
              <td style={{ color: '#a86b00', fontSize: 11 }}>{UNPRICED}</td>
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
      <p style={{ fontSize: 12, color: '#666', margin: '4px 0 0' }}>什器は、単価が決まるまで、工事原価（概算）の合計には入れない。</p>
    </section>
  )
}
