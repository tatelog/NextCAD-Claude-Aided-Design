# 実装前仕様

- mm・右手Z上・絶対高さを維持し、階標高は加算しない。
- 単純な凹多角形と穴付き断面を閉じた三角形meshおよびIFC4押出しに変換する。
- wall/column/beam/slab/balconyだけを部材として出力する。
- openingは親部材の契約がないため除外し、space/stair/otherも未対応として理由を返す。
- null/unresolved、不正な輪郭・穴・階参照を除外する。estimatedは保持する。
- 元ID・source・statusをsceneとIFCプロパティに保存する。
- IFCの単位、階、形状を独立パーサーで確認する。
- 元入力は変更しない。全体契約不正・重複IDは例外にする。

## 次段階：親壁付き開口（上記初版の開口除外仕様を更新）

- ElementにhostElementIdを任意追加し、openingには有効な同階の親wallを要求する。
- 開口の有効な押出し形状と親壁の体積交差を確認し、不正な親・形状はissuesへ記録する。
- sceneは高さ帯ごとの差分により実際に切欠く。重なる開口は一度だけ控除する。
- 元壁IDを各meshに維持し、開口の元ID・推定状態はappliedOpeningsに保存する。
- IFCはIfcOpeningElement/IfcRelVoidsElementで切欠き関係を保存し、独立パーサーで除去後の体積を確認する。
- 開口配置は親壁を基準とする。貫通/窪みを推測せずNOTDEFINEDとする。

## 次段階：IFC2X3

- intermediateToIfc(model,schema?:'IFC4'|'IFC2X3')。既定はIFC4、未対応値は例外。
- IFC2X3のIfcRoot派生すべてに必須OwnerHistoryと関連主体を出力する。
- Wall/Column/Beam/OpeningElementのPredefinedTypeはIFC4だけ、Slabは両版で保持する。
- 両版をweb-ifcで読み、属性数・親壁関係・開口切欠き体積・穴付き断面・階Z・単位・元IDを確認する。
