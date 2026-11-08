// 設計からの引継ぎを表示し、残る申請情報だけ編集する。
// 「はい・いいえ」の項目は「未入力」「はい」「いいえ」から選ぶ。既定は未入力（統括の指示 2026-11-06）。
// 構造と用途は選ばせず、固定の値を表示だけする（このアプリの対象は RC 造の板状マンション。統括の指示 2026-11-06）。
import { APP_STRUCTURE, APP_USAGE, type PermitProject } from '../law/permitInput'

function YesNo({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>
      {label}{' '}
      <select value={value === null ? '' : value ? 'yes' : 'no'} onChange={(e) => onChange(e.target.value === '' ? null : e.target.value === 'yes')}>
        <option value="">未入力</option>
        <option value="yes">はい</option>
        <option value="no">いいえ</option>
      </select>
    </label>
  )
}

export function PermitProjectFields({
  project,
  onChange,
  inherited={},
}: {
  inherited?:Partial<Record<keyof PermitProject,string>>
  project: PermitProject
  onChange: <K extends keyof PermitProject>(key: K, value: PermitProject[K]) => void
}) {
  return (
    <>
      <p style={{ margin: '0 0 4px', fontSize: 13 }}>{`構造: ${APP_STRUCTURE}（このアプリの対象）`}</p>
      <p style={{ margin: '0 0 4px', fontSize: 13 }}>{`用途: ${APP_USAGE}（同）`}</p>
      {Object.entries(inherited).map(([key,source])=><p key={key} style={{fontSize:13}}>{{hasElevator:'昇降機',hasBuildingEquipment:'建築設備',inShadowRegulationArea:'日影規制区域'}[key]}：{project[key as keyof PermitProject]?'あり':'なし'} <small>（{source}から反映）</small></p>)}
      <details><summary>申請情報の補足</summary>
      <p style={{fontSize:12}}>設計データで判明した項目は上に自動反映しています。以下は申請者・設計者が決める情報、またはまだ記録がない項目です。</p>
      {!inherited.inShadowRegulationArea&&<YesNo label="日影規制区域内" value={project.inShadowRegulationArea} onChange={(v)=>onChange('inShadowRegulationArea',v)}/>}
      <YesNo label="構造計算を行う（概算断面の算定とは別）" value={project.structuralCalc} onChange={(v)=>onChange('structuralCalc',v)}/>
      <YesNo label="代理者が申請する" value={project.hasAgent} onChange={(v)=>onChange('hasAgent',v)}/>
      <YesNo label="BIM 由来の図書で申請する" value={project.bimSubmission} onChange={(v)=>onChange('bimSubmission',v)}/>
      <YesNo label="認定を受けた部材・構造方法を用いる" value={project.usesCertifiedParts} onChange={(v)=>onChange('usesCertifiedParts',v)}/>
      {!inherited.hasBuildingEquipment&&<YesNo label="建築設備を含む" value={project.hasBuildingEquipment} onChange={(v)=>onChange('hasBuildingEquipment',v)}/>}
      {!inherited.hasElevator&&<YesNo label="昇降機がある" value={project.hasElevator} onChange={(v)=>onChange('hasElevator',v)}/>}
      </details>
    </>
  )
}
