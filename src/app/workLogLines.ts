// 線が変わるたびに、作業履歴の行を一つ、その時点の状態つきで書く（G68。仮置き）。
// 戻すこと・読み込みも、線が変われば同じ経路で行に残る。
import { useDrawing } from '../store/drawing'
import { useFixtures } from '../store/fixtures'
import { useFeatures } from '../store/features'
import { recordWorkLog } from './workLogStore'
import { lineChangeEntry } from './workSnapshot'

/** 線（entries）が変わったときに作業ログへ書く。止めるための関数を返す。 */
export function startLineLog(): () => void {
  return useDrawing.subscribe((s, prev) => {
    if (s.entries === prev.entries) return
    // 自動保存（機能のオンオフ）をオフにしているときは、状態を残さない
    if (!useFeatures.getState().on.autoSave) return
    const state = {
      entries: s.entries,
      storeyCount: s.storeyCount,
      storeyHeightMm: s.storeyHeightMm,
      fixtures: useFixtures.getState().fixtures,
    }
    recordWorkLog(lineChangeEntry(state, new Date().toISOString()))
  })
}
