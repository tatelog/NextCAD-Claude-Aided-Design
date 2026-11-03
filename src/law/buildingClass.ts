// 法 6 条 1 項・法 20 条 1 項の号区分（ハブ A-03 G28・D-02 C11）。決定論。条文の根拠は buildingClass.test.ts の先頭に書く。
// 「大規模建築物」の判定の一部（確認申請の号と構造計算の号）。防火・高度地区などの他の法規とは別に扱う。

export type Structure = 'RC' | 'SRC' | 'steel' | 'wood'

export interface BuildingFacts {
  structure: Structure
  /** 高さ（m） */
  heightM: number
  /** 地上の階数（地階を除く） */
  aboveGroundStoreys: number
  /** 延べ面積（㎡） */
  totalFloorAreaM2: number
  /** 別表第一（い）欄の特殊建築物の用途部分の床面積（㎡）。特殊建築物でなければ 0 */
  specialUseAreaM2: number
  /** 都市計画区域・準都市計画区域の内か */
  inPlanningArea: boolean
}

/** 法 6 条 1 項の号（1・2・3）。区域外で 1・2 に当たらなければ '対象外' */
export function article6Class(f: BuildingFacts): 1 | 2 | 3 | '対象外' {
  if (f.specialUseAreaM2 > 200) return 1
  if (f.aboveGroundStoreys >= 2 || f.totalFloorAreaM2 > 200) return 2
  return f.inPlanningArea ? 3 : '対象外'
}

/** 法 20 条 1 項の号（1〜4） */
export function article20Class(f: BuildingFacts): 1 | 2 | 3 | 4 {
  if (f.heightM > 60) return 1
  if (f.structure === 'wood') {
    if (f.aboveGroundStoreys >= 4 || f.heightM > 16) return 2
    // 木造は、階数 3 以上 または 延べ面積 300 ㎡ 超のものが第三号の対象
    const sixOneOneOrTwo = article6Class(f) === 1 || article6Class(f) === 2
    return sixOneOneOrTwo && (f.aboveGroundStoreys >= 3 || f.totalFloorAreaM2 > 300) ? 3 : 4
  }
  if (f.structure === 'steel' && f.aboveGroundStoreys >= 4) return 2
  if ((f.structure === 'RC' || f.structure === 'SRC') && f.heightM > 20) return 2
  const sixOneOneOrTwo = article6Class(f) === 1 || article6Class(f) === 2
  return sixOneOneOrTwo ? 3 : 4
}

/** 号区分を、画面に出す文にする（仕様 7）。区域外で 6 条の号に当たらないときは「対象外（区域外）」 */
export function classLabelsOf(f: BuildingFacts): { article6: string; article20: string } {
  const a6 = article6Class(f)
  return {
    article6: a6 === '対象外' ? '法 6 条 1 項 対象外（区域外）' : `法 6 条 1 項 第 ${a6} 号`,
    article20: `法 20 条 1 項 第 ${article20Class(f)} 号`,
  }
}
