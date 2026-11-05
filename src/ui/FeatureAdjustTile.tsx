// 描画のモードの右パネルの項目「機能の調整（G43）」（ハブ A-03 G43・G70・G95、統括の依頼 t55）。機能一覧を、SVG のチェックの行で出す。
import { recordWorkLog } from '../app/workLogStore'
import { FEATURE_ITEMS, featureShown, setFeatureOn, type FeatureKey } from '../store/features'
import { featureMenuGroupsOf } from './menuGroups'
import { MenuCheckRows } from './MenuCheckRows'

export interface FeatureAdjustTileProps {
  /** 作業ログに残す画面（P2 か P3） */
  screen: string
}

export function FeatureAdjustTile({ screen }: FeatureAdjustTileProps) {
  return (
    <MenuCheckRows
      groups={featureMenuGroupsOf((key: FeatureKey) => featureShown(key))}
      onToggle={(id, shown) => {
        const f = FEATURE_ITEMS.find((i) => i.key === id)
        if (!f) return
        setFeatureOn(f.key, shown)
        recordWorkLog({
          at: new Date().toISOString(),
          screen,
          action: f.group === '表示' ? '表示' : '機能',
          target: `${f.label} ${shown ? '入' : '切'}`,
        })
      }}
    />
  )
}
