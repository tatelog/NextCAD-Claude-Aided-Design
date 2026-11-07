import {UnitReshapeEditor} from './UnitReshapeEditor'
import type {UnitPlan39} from '../plan/unitPlan39'
import { readUnitPlan } from '../plan/unitPlan39'
import { UnitPlanDrawing } from './UnitPlanDrawing'
import type {Room} from '../plan/rooms'
import type {Rect} from '../plan/candidateCells'
// 住戸の詳細パネル（ハブ A-03 G76）。P3 の図面で住戸をダブルクリックすると、右から出る。中身は plan/unitDetail の結果。
// 操作は二つ。「この住戸を直す（P3 に戻る）」は閉じるだけ（描き直しは図面で行う）。「同タイプの住戸に反映」は未配線（住戸タイプの持ち方が未決）。
import type { UnitDetail } from '../plan/unitDetail'
import { commonAreasOf } from '../plan/commonAreas'

export interface UnitDetailPanelProps {
  updateError?:string|null
  planOverride?:UnitPlan39
  onReshape?:(plan:UnitPlan39)=>string|null
  planTypeId?: string
  planCorridor?: Rect
  planVariant?: string
  onPlanVariant?: (variant:string)=>void

  /** 選んだ住戸の詳細。無ければ何も出さない */
  detail: UnitDetail | null
  layers?: {outline:boolean;rooms:boolean;shaft:boolean;dimensions:boolean}
  cell?: Rect
  planRooms?: Room[]
  onClose: () => void
  /** 階数（基準階を何階に複製するか）。無ければ未配線と出す */
  storeyCount?: number
  /** 天井高（mm。仮置き）。無ければ未配線と出す */
  ceilingMm?: number
  /** 区画の部屋の種類 */
  rooms?: string[]
  /** 描いた線のうち、区画の中の壁の本数と開口の数（意味づけの結果）。無ければ未配線と出す */
  walls?: number
  openings?: number
  /** バルコニー（仮置きの面と面積。plan/balcony）。無ければ未配線と出す */
  balcony?: { faces: readonly string[]; areaM2: number }
  /** この住戸の PS（水回りの縦シャフト。mm。plan/unitDetail の psOfUnit）。undefined は未配線、null は PS が無い */
  shaft?: { x0: number; y0: number; x1: number; y1: number } | null
  /** 同じ間口・奥行の住戸の ID。無ければ「同タイプの住戸に反映」は押せない */
  sameTypeIds: string[]
  /** 「同タイプの住戸に反映」を押したとき（この住戸の什器を同タイプへ） */
  onApplySameType: () => void
  /** この区画に付いている 1F の名前（無ければ null） */
  firstFloorName?: string | null
  /** 1F の名前を選んだとき（null は外す）。省略すると欄を出さない */
  onSetFirstFloorName?: (name: string | null) => void
}

const listOrNone = (items: readonly string[]) => (items.length > 0 ? items.join('、') : 'なし')
// 1F の共用部の名前（必須の 6 つ）
const FIRST_FLOOR_NAMES = commonAreasOf('1F')

export function UnitDetailPanel({ updateError, planOverride, onReshape, planTypeId, planCorridor, planVariant="A", onPlanVariant, detail, onClose, cell, planRooms = [], shaft, layers = {outline:true,rooms:true,shaft:true,dimensions:true}, rooms = [], sameTypeIds, onApplySameType, firstFloorName = null, onSetFirstFloorName }: UnitDetailPanelProps) {
  if (!detail) return null
  let sourcePlan; try { sourcePlan=planOverride??(planTypeId?readUnitPlan(planTypeId,planVariant):null) } catch { sourcePlan=null }
  return (
    <aside
      aria-label="住戸の詳細"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 'min(720px, 90vw)',
        boxSizing: 'border-box',
        padding: 12,
        background: '#fff',
        borderLeft: '1px solid #ddd8cc',
        boxShadow: '-4px 0 12px rgba(0,0,0,0.12)',
        overflowY: 'auto',
        zIndex: 40,
      }}
    >
      <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>{`住戸 ${detail.id}`}</h2>
      <button type="button" aria-label="住戸詳細を閉じる" onClick={onClose} style={{position:'absolute',right:12,top:10,border:0,background:'transparent',fontSize:22,color:'#888'}}>×</button>
      {planTypeId && <label>間取り案 <select aria-label="間取り案" value={planVariant} onChange={e=>onPlanVariant?.(e.target.value)}>{['A','B','C'].map(v=><option key={v}>{v}</option>)}</select></label>}
      {updateError && <p role="alert" style={{color:'#a43e32'}}>{updateError}</p>}
      {sourcePlan && <UnitReshapeEditor key={`${detail.id}-${planVariant}`} source={sourcePlan} onApply={onReshape}/>}
      {cell && <>
        <svg role="img" aria-label={`住戸 ${detail.id} の平面詳細`} viewBox={`${cell.x0-600} ${cell.y0-600} ${cell.x1-cell.x0+1200} ${cell.y1-cell.y0+1200}`} style={{width:'100%',height:'min(62vh, 580px)',background:'#f7f8fa'}}>
          {layers.outline && <rect x={cell.x0} y={cell.y0} width={cell.x1-cell.x0} height={cell.y1-cell.y0} fill="white" stroke="#1f2a44" strokeWidth={2} vectorEffect="non-scaling-stroke"/>}
          {layers.rooms && !planTypeId && planRooms.map(r=><g key={r.id}>
            <rect x={r.x0} y={r.y0} width={r.x1-r.x0} height={r.y1-r.y0} fill={r.kind==='水回り'?'#dfecef':r.kind==='LDK'?'#f4efdf':'#edf0f5'} stroke="#788391" strokeWidth={1} vectorEffect="non-scaling-stroke"/>
            <text x={(r.x0+r.x1)/2} y={(r.y0+r.y1)/2} textAnchor="middle" dominantBaseline="middle" fontSize={Math.min(cell.x1-cell.x0,cell.y1-cell.y0)/24} fill="#1f2a44">{r.kind}</text>
          </g>)}
          {layers.rooms && planTypeId && planCorridor && <UnitPlanDrawing override={planOverride} typeId={planTypeId} variant={planVariant} cell={cell} corridor={planCorridor}/>}
          {layers.shaft && !planTypeId && shaft && <g><rect x={shaft.x0} y={shaft.y0} width={shaft.x1-shaft.x0} height={shaft.y1-shaft.y0} fill="#e9d5a7" stroke="#89744a" strokeWidth={1} vectorEffect="non-scaling-stroke"/><text x={(shaft.x0+shaft.x1)/2} y={(shaft.y0+shaft.y1)/2} textAnchor="middle" dominantBaseline="middle" fontSize={180}>PS</text></g>}
          {layers.dimensions && <g><text x={(cell.x0+cell.x1)/2} y={cell.y1+360} textAnchor="middle" fontSize={220}>{(cell.x1-cell.x0).toLocaleString("ja-JP")} mm</text>
          <text x={cell.x1+360} y={(cell.y0+cell.y1)/2} textAnchor="middle" fontSize={220} transform={`rotate(-90 ${cell.x1+360} ${(cell.y0+cell.y1)/2})`}>{(cell.y1-cell.y0).toLocaleString("ja-JP")} mm</text></g>}
        </svg>
        <p style={{fontSize:12,color:'#777'}}>{planRooms.length ? '保存された間取り案を実寸表示。窓は位置記号、柱は中心位置です（寸法は元データに未収録）。' : 'この住戸の部屋割りは未作成です。住戸外形を表示しています。'}</p>
      </>}
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px', fontSize: 13 }}>
        <li>{`間口 ${(sourcePlan?.envelope.W ?? detail.frontageMm).toLocaleString()} mm`}</li>
        <li>{`奥行 ${(sourcePlan?.envelope.D ?? detail.depthMm).toLocaleString()} mm`}</li>
        <li>{`専有面積 ${detail.areaM2.toFixed(2)} m²`}</li>
        <li>{`隣戸 ${listOrNone(detail.neighbors)}`}</li>
        <li>{`廊下側 ${listOrNone(detail.corridorSides)}`}</li>
        <li>{`外側 ${listOrNone(detail.outerSides)}`}</li>
        <li>{`置いた什器 ${listOrNone(detail.fixtures)}`}</li>
        <li>{`部屋 ${listOrNone(rooms)}`}</li>
      </ul>
      {onSetFirstFloorName ? (
        <label style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
          1F の共用部として使う
          <select
            value={firstFloorName ?? ''}
            onChange={(e) => onSetFirstFloorName(e.target.value === '' ? null : e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="">なし</option>
            {FIRST_FLOOR_NAMES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button type="button" onClick={onClose}>閉じる</button>
        <button type="button" onClick={onClose}>
          この住戸を直す（平面に戻る）
        </button>
        <button
          type="button"
          disabled={sameTypeIds.length === 0}
          title={sameTypeIds.length === 0 ? '同じ間口・奥行の住戸が無い' : `同タイプ: ${sameTypeIds.join('、')}`}
          onClick={onApplySameType}
        >
          同タイプの住戸に反映
        </button>
      </div>
    </aside>
  )
}
