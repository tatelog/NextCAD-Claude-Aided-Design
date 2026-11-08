# 平面からBIM中間モデル（担当1）

完了範囲は、このディレクトリの型・JSON Schema・純粋変換・既存平面adapter・架空fixture・対象テスト。画面、store、既存IFC writer、他担当、公開・構造設計への拡張は対象外。

## 接続

```ts
import { autoPlanToSnapshot, planToIntermediate, validateIntermediate } from './src/bimExchange/intermediate/index'

const snapshot = autoPlanToSnapshot({
  source: saved.source,
  plans: saved.plans, // useFloorPlansのsource/plansのコピー
  storeys: [{ floor: 2, id: 'floor-2', name: '2階', elevationMm: 3000, heightMm: 3000 }],
  slabThicknessMm: 200,
})
const model = planToIntermediate(snapshot)
const errors = validateIntermediate(model)
// modelを担当2のintermediateToScene/intermediateToIfcへ渡す。
// JSON.stringify(model)の保存結果を担当3のCLIへ渡す。
```

`index.ts` が公開入口。実行時依存は既存のzodとpolygon-clipping、および既存の純粋な平面処理 `clearEntry` / `corridorForCell` とその依存。AutoPlan / UnitPlan39自体は型参照のみで、ZustandやViteのimport.meta.globを単独プログラムへ持ち込まない。型定義の所有元は `schema.ts`。他担当との実接続試験は本担当では実施しない。

`intermediate.schema.json` は共通出力、`snapshot.schema.json` は入力のJSON Schema。JSON Schemaは構造検証用。ID一意性、階参照、形状の自己交差・穴の包含、nullとstatusの整合は `validateIntermediate` で追加検証する。変換時の不正な型・参照は例外、不足形状または無効な輪郭はnull形状とwarningを残す。元のissuesも保持する。

## 座標と確定状態

- 入力snapshotのXYは右手系の建物共通絶対座標。`baseOffsetMm` のみ階基準からの相対高さ。出力 `zMm = elevationMm + baseOffsetMm` は絶対高さで、後段は階標高を足さない。
- 既存平面adapterは既定でy下向き平面を `(x,-y)` に変換する。既にy上向きなら `yAxis:'up'` を明示。外周は反時計回り、穴は時計回りに正規化し終点重複を除去する。
- 各階の標高・高さは呼出元が明示。保存されていない階は生成せず、同じ平面を他階へ複製しない。階IDを要素IDに含め、sourceに階ID、元floorキー、元source、元要素IDを保持する。
- 断面不明の柱・壁、開口寸法不足、階段詳細不足は `geometry:null/status:unresolved`。概算由来はconfirmedに昇格しない。確認済み形状は正規化snapshotまたは `additionalElements` から明示できる。`additionalElements` のXYは右手系、Zは相対高さ。
- 床版厚200mmは引継ぎの計画条件。既存平面由来の床版・空間はestimated。床版は階基準から上方へ押し出す規約とし、仕上げ床・躯体天端の実施設計基準ではない。

## 床版・バルコニーと追跡

室内床版からバルコニー領域と吹抜けを控除し、バルコニー同士も先行要素との重複を控除する。分割されたpolygonは元IDを維持した別要素となる。完全控除された要素はnullで保持。吹抜けは控除済みのopeningとしても追跡し、実体量に加算しない。元外形は変更しない。

外形・床版は元モデルに専用IDがないため `buildingOutline` と元source・階IDを合成参照として使う。部屋境界からの壁は「候補」であり、個別壁の確定実体・数量ではない。柱を隣接住戸間で同一柱と推定統合する処理も行わない。

## 未解決範囲

住戸マスタの実行時読込は既存実装がVite依存のため行わない。保存済 `unitPlanOverrides` または `unitPlansByFloor[floor][cellId]` の供給が必要。両方ある場合は呼出元が解決した `unitPlansByFloor` を優先する。未提供時は `UNIT_DETAIL_UNAVAILABLE`。供給済詳細に既存描画と同じclearEntry補正・廊下選択・寸法照合・回転を適用する。寸法不一致では実体化せず `UNIT_PLACEMENT_INVALID`。任意の描画線は呼出元でsnapshotに正規化する必要がある。

材料強度、配筋、接合、仕上げ層、構造適合性は未確定。開口ブーリアンとIFC関係生成はconversion担当。RC、外装タイル／ゆず肌二回塗、LGS+ボードという引継ぎ条件から断面を捏造しない。構造設計・確認申請済みモデルではない。

## P5接続・所属壁（次段階）

共通Elementと入力SnapshotElementに `hostElementId?:string` を追加した。指定できるのはopeningだけで、同じ階に存在する別のwallを参照する。自己参照、参照切れ、階違い、wall以外への参照は `INVALID_HOST`。未解決のopeningでも所属壁が一意なら参照を保持する。後段はこのIDを使用し、null形状を実体化しない。

親のP5 bridgeは利用者が「概算寸法を使う」を選んだ時だけ次を渡す。

```ts
autoPlanToSnapshot({
  source, plans, storeys,
  unitPlansByFloor, // readUnitPlan等で解決した住戸詳細。保存overrideも反映したもの
  detailDimensions: {
    exteriorWallMm: 200, partitionWallMm: 115,
    doorHeightMm: 2100, windowHeightMm: 1200, windowSillMm: 900,
    // columnWidthMm / columnDepthMm は未指定なら柱断面未解決
  },
})
```

これらの数値をadapterが既定値として持つことはない。壁は床版上面（baseOffsetMm=床版厚）から次階基準まで（heightMm=階高−床版厚）の概算、扉下端も床版上面、窓下端は床版厚＋窓台高さ。全てestimated。梁下・天井下・仕上げ基準の実寸とは扱わない。正でない値・非有限値は拒否する。

共有室境界を重複する部屋ごとに増やさず、住戸内で一度だけ壁にする。外側は住戸包絡の4辺を壁候補とする。扉のaxis/coord/start/widthが全て収まる壁が一意の場合だけ所属を決める。開口が壁の上下端を外れる場合も形状を残さず未解決とする。

**窓はこの引数だけでは実体化しない。** 既存 `planSpecObjects.ts` は窓の実幅・高さを未登録としており、描画の25〜75%区間は図示表現。`windowHeightMm/windowSillMm` があっても幅と開始位置を推定しない。所属壁は追跡する。寸法の取得後、下の `openings` で明示できる。

仕様明細の個別入力には `specifications?:UnitSpecifications`、住戸別上書きには `unitSpecificationsByFloor[floor][cellId]` を使用する（型は `index.ts` からexport）。

```ts
specifications: {
  partitionWall: { thicknessMm:115, heightMm:2600, baseOffsetMm:200, status:'estimated' },
  envelopeWall: { thicknessMm:200, heightMm:2800, baseOffsetMm:200, status:'estimated' },
  door: { heightMm:2100, baseOffsetMm:200, status:'estimated' },
  openings: {
    '窓の元ID': { startMm:600, widthMm:1200, heightMm:1200, baseOffsetMm:1100, status:'estimated' },
  },
}
```

窓のstartMmは住戸ローカル座標で水平辺ならx、垂直辺ならy。部屋端からの相対距離ではない。壁の個別キーは `walls['wall/<辞書順の室ID1>/<室ID2>/<h|v>']` で、既存planSpecObjectsの末尾と対応する。住戸包絡は `walls['envelope/N']`（S/E/Wも可）。各仕様の未指定フィールドは未解決。上書きは仕様オブジェクト単位で、既定値から欠損寸法を暗黙継承しない。既存平面に基づく実体は、仕様値がconfirmedでも推定配置を含むためestimatedを維持する。

隣接住戸間の戸境壁・柱を同一物として統合する処理は未実装。外形由来の未解決壁候補も残る。図形の数量合算を確定積算として使わない。`fixture.hosted.intermediate.json` は所属壁付き扉と未解決窓を含む契約fixture。

## 実行と証跡

リポジトリルートで実行する。

```powershell
npx vitest run src/bimExchange/intermediate/intermediate.test.ts --reporter=json --outputFile=src/bimExchange/intermediate/test-results.json
node src/bimExchange/intermediate/write-artifacts.mjs
```

後者はNode 24でSchema・架空JSON fixtureを生成し、担当範囲の型診断を保存する。`fixture.intermediate.json` は共通契約例、`fixture.autoplan.intermediate.json` は既存平面adapter例。`verification-results.json` が対象テストの最新結果集約、`typecheck-results.json` が型診断。元証跡は `test-results.json` と `hosts-results.json`（後者が数値ソート・符号付きゼロの比較修正後の所属壁テスト）。`test-red.json` / `hosts-red.json` は各段階の実装前の失敗証跡。画面の変更・操作がないため画面証跡は親担当。

対象テスト: PASS

型検査: PASS

全体テスト: 未実行

引継ぎ時点: 2026-11-08。対象は未コミットの本ディレクトリ。既存の未コミット変更は保持し、コミット・公開はしていない。
