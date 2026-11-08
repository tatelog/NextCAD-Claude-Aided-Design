# 共通JSON → 3D mesh / IFC（担当2）

## 接続入口

`src/bimExchange/conversion/index.ts` から `intermediateToScene(model)` と `intermediateToIfc(model, schema?)` を名前付きimportする。入力は `types.ts` の `IntermediateModel`。型は共通契約初版 `bim-intermediate/1` に準拠する。既存writer・画面・storeへの依存や書込みはない。

```ts
import { intermediateToIfc, intermediateToScene } from '../conversion/index'
const scene = intermediateToScene(model)
const { ifcText, issues } = intermediateToIfc(model)
```

実行環境は既存依存のThree.js・polygon-clippingとWeb Cryptoを備えた環境（Node.js 22以降を推奨）。IFC生成自体はweb-ifcに依存しない。web-ifcは独立読込テストにのみ使用する。CLIの実装・接続は担当3の範囲。

## 出力

- scene: `schemaVersion: 'bim-mesh-scene/1'`、`units: 'mm'`、`coordinateSystem: 'right-handed-z-up'`、`storeys`、`meshes`、`issues`。
- 各mesh: `elementId`、`kind`、`storeyId`、`source`、`status`、平坦な`vertices: number[]`（xyz）、三角形の`indices: number[]`。座標は建物共通の絶対座標。表面の法線方向は外向き。
- IFC: IFC4またはIFC2X3 STEP、mm。階は標高で配置、要素は `zMm - 階標高` の相対配置とし、絶対Zを維持する。
- `BIM_Intermediate`プロパティセットに`IntermediateId`、`SourceElementIds`（JSON文字列）、`SourceOrigin`、`Status`、`Kind`、`StoreyId`、任意の`SourceNote`を保存する。IFC GlobalIdは書出しごとに生成するので、差分追跡はIntermediateIdを使用する。
- 元のissuesを維持し、除外要素ごとに理由を追加する。全体契約・階定義・重複IDの不正は例外。個別要素の不正はissuesに記録して除外する。

## 対応範囲と未解決事項

wall→IfcWall、column→IfcColumn、beam→IfcBeam、slab/balcony→IfcSlab。高さ方向の押出し形状が与えられたものだけを変換する。凹多角形、複数の独立した穴に対応。輪郭の向きは正規化し、交差・接触・外部の穴・穴同士の包含は拒否する。平面の穴は全押出し深さを貫通する。

**openingは`hostElementId?: string`を持つ契約に対応**。有効な親wall・同一階・有効な押出し形状・体積の重なりを確認する。親ID未指定は`OPENING_HOST_UNSPECIFIED`、存在しない/非壁/未解決の親は`OPENING_HOST_INVALID`、別階は`OPENING_STOREY_MISMATCH`、重なりなしは`OPENING_NO_INTERSECTION`として除外する。親壁や寸法は推測しない。

sceneは開口上下端で高さ帯に分割し、polygon-clippingの差分で壁の実体を除去する。複数開口が重なっても重複控除しない。**同じelementIdを持つmeshが複数返る**ため、利用側はIDごとに上書きせず全meshを表示・保存すること。各片は閉じた押出しで、帯境界には内部の共面キャップが残る（外形と体積は正しいが、単一の溶接済み多様体meshではない）。開口は実体meshとして出さず、親壁meshの`appliedOpenings: {id,source,status}[]`に出典と推定状態を保持する。壁自体のstatusは入力を維持し、切欠きの確定状態はappliedOpeningsも参照する。

IFCはIfcOpeningElementとIfcRelVoidsElementを出力し、開口配置は親壁相対にする。開口を階の包含リストへ直接入れない。`HostElementId`プロパティも保持する。貫通開口か窪みかは契約で区別されないためPredefinedTypeはNOTDEFINED。IfcDoor/IfcWindowなど建具本体の補完はしない。切欠き対象は指定した親壁だけで、隣接する別壁へ自動伝播しない。

space/stair/otherは`UNSUPPORTED_KIND`で除外する。geometry:nullまたはstatus:unresolvedは出力しない。estimatedはそのまま保持する。材料・RC強度・仕上げ・断面寸法は推測・補完しない。床版とバルコニーの重なりは自動統合しない（入力側で重複を解消する）。構造設計・申請・施工の妥当性確認済みモデルではない。

全要素が除外されてもIFCの空の空間階層は返る。呼出し元はissuesとmesh数等で部分成功・空出力を判定し、無条件成功としない。

## 証跡と作業範囲

仕様はSPEC.md、テストはconversion.test.ts・openings.test.ts・schema.test.ts。test-red.jsonは実装前の失敗証跡、test-results.jsonは対象テスト、regression-results.jsonは回帰テスト、typecheck-results.jsonは型チェックの機械可読結果。

この担当の編集は本ディレクトリ内のみ。package/lock/tsconfig/既存writer/画面は変更しない。UI統合・公開・既存モデル更新は対象外。

## 参照仕様

[buildingSMART: IfcExtrudedAreaSolid（IFC4）](https://standards.buildingsmart.org/IFC/RELEASE/IFC4/ADD2_TC1/HTML/schema/ifcgeometricmodelresource/lexical/ifcextrudedareasolid.htm)
## 引継ぎ時点の確認

対象テスト：PASS

初版実装時点のリポジトリ全体のテストと型チェックは失敗。担当外の床版厚150mm期待に対して200mm、数量・UI期待値不一致、およびspecSelections/planSpecObjects等の未配置モジュール参照がある。既存ファイルの修正は行っていない。全文はregression-results.jsonとtypecheck-results.jsonに保持。これらは共有チェックアウトの観測時点の結果であり、他担当による後続変更後の状態は保証しない。

担当単独の型チェックは`node src/bimExchange/conversion/check-types.mjs`、結果はtypecheck-scoped.json。専用tsconfig.jsonは親設定を継承し、担当ファイルだけを対象にする。

対象テスト実行入口: `npx vitest run src/bimExchange/conversion --reporter=json --outputFile=src/bimExchange/conversion/test-results.json`。

担当単独の型チェック：PASS


## 開口対応の引継ぎ

入口と基本JSONバージョンは変更なし。ElementへhostElementIdを任意追加（openingの変換には必須）。接続側は保存済み平面から親壁IDと開口の絶対座標・絶対Zを渡す。IFC/sceneは同一の開口検証を共有する。変換中にファイルや入力モデルを書き換えない。

対象テスト：PASS
担当型チェック：PASS

追加証跡: openings-red.json / openings-metadata-red.json。最新の対象結果はtest-results.json、型結果はtypecheck-scoped.json。初版の全体結果は履歴として保持し、今回の全体状態を示すものではない。保存済み平面からの実接続・UI操作・保存操作は親担当の確認範囲。

[buildingSMART: IfcOpeningElement（IFC4）](https://standards.buildingsmart.org/IFC/RELEASE/IFC4/FINAL/HTML/schema/ifcproductextension/lexical/ifcopeningelement.htm)

## IFC2X3対応の接続契約

```ts
import { intermediateToIfc } from '../conversion/index'
import type { IfcSchema } from '../conversion/index'
const schema: IfcSchema = 'IFC2X3' // 'IFC4' または 'IFC2X3'
const result = intermediateToIfc(model, schema)
```

第二引数省略時はIFC4。戻り値は従来と同じ`{ifcText,issues}`。未対応schemaは例外として拒否する。scene側のAPIは変更なし。

IFC2X3は全IfcRoot派生にOwnerHistoryを付与し、Person/Organization/PersonAndOrganization/Applicationを作成する。実在の設計者や施主を推定せず、未指定の書出し担当とBIM exchange生成処理を記録する。ChangeActionはADDED、CreationDateは書出し時刻。既定IFC4のOwnerHistoryは従来どおり省略する。

IFC2X3のIfcWall/IfcColumn/IfcBeam/IfcOpeningElementにはIFC4用の末尾PredefinedTypeを出さない。IfcSlabは両版でPredefinedTypeを出す。開口の親壁関係・親壁相対配置、穴付き押出し、階の高さ・mm単位、元IDと推定状態のプロパティは両版で保持する。IFC2X3の開口種別はObjectType（opening）で識別できるが、貫通/窪みは断定しない。

対象テスト：PASS
担当型チェック：PASS

最新証跡はtest-results.json・typecheck-scoped.json、実装前証跡はschema-red.json。web-ifc読込による確認であり、外部BIMソフトへの取込・認証適合の確認ではない。P3/P5/PDFと保存処理のschema引数接続、画面証跡は親担当の範囲。

[buildingSMART: IfcRoot（IFC2X3、必須OwnerHistory）](https://standards.buildingsmart.org/IFC/RELEASE/IFC2x3/FINAL/HTML/ifckernel/lexical/ifcroot.htm)
