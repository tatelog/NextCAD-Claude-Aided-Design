// 設計からの引継ぎを表示する（構造・用途は固定、昇降機・建築設備・日影規制区域はほかの画面から写す）。
// 構造計算・代理申請・BIM 申請・認定部材の「はい・いいえ」は出さない（代表の決定 2026-11-08。関わる書類は一覧で要確認のまま残す）。
// 構造と用途は選ばせず、固定の値を表示だけする（このアプリの対象は RC 造の板状マンション。統括の指示 2026-11-06）。
import { APP_STRUCTURE, APP_USAGE, type PermitProject } from '../law/permitInput'

export function PermitProjectFields({
  project,
  inherited={},
}: {
  inherited?:Partial<Record<keyof PermitProject,string>>
  project: PermitProject
}) {
  return (
    <>
      <p style={{ margin: '0 0 4px', fontSize: 13 }}>{`構造: ${APP_STRUCTURE}（このアプリの対象）`}</p>
      <p style={{ margin: '0 0 4px', fontSize: 13 }}>{`用途: ${APP_USAGE}（同）`}</p>
      {Object.entries(inherited).map(([key,source])=><p key={key} style={{fontSize:13}}>{{hasElevator:'昇降機',hasBuildingEquipment:'建築設備',inShadowRegulationArea:'日影規制区域'}[key]}：{project[key as keyof PermitProject]?'あり':'なし'} <small>（{source}から反映）</small></p>)}

    </>
  )
}
