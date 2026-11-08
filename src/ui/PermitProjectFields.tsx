// 設計からの引継ぎを表示し、残る申請情報だけ編集する。
// 「はい・いいえ」の項目は「未入力」「はい」「いいえ」から選ぶ。既定は未入力（統括の指示 2026-11-06）。
// 構造と用途は選ばせず、固定の値を表示だけする（このアプリの対象は RC 造の板状マンション。統括の指示 2026-11-06）。
import { APP_STRUCTURE, APP_USAGE, type PermitProject } from '../law/permitInput'

export function PermitProjectFields({
  project,
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

    </>
  )
}
