# 担当3：CLI・manifest・ツール契約

完了範囲は入力検証、変換呼出し、manifest、標準入出力、終了コード、一時出力からの確定保存、ツール定義。契約変更や専有範囲外の編集が必要なら停止する。既存設定・画面・他担当は変更しない。

## 起動

Node.js 24.12.0と既存のtypescript依存を使用。リポジトリ直下で実行する。

```powershell
node src/bimExchange/harness/cli.mjs --input input.json --output work/bim-result
Get-Content input.json -Raw | node src/bimExchange/harness/cli.mjs --input - --output work/bim-result-stdin
```

出力先は新規フォルダ。空でも既存なら拒否する。入力はUTF-8、BOM許容。標準出力は結果JSON一行、標準エラーはエラー説明。`--help`のみ説明文。mockへの自動代替はない。

|終了コード|意味|
|---|---|
|0|保存完了。partial・issuesの確認が必要|
|2|引数不正|
|3|入力読取・JSON・契約不正|
|4|変換器未着・変換例外・戻り値不正|
|5|既存出力または保存エラー|

## 入力と依存注入

`validateModel(model)` は単位・座標系・必須項目・ID重複・階参照・有限寸法・正の押出高さ・リングの頂点数/面積/終点重複を確認する。自己交差、穴包含、構造・法規適合は判定しない。追加プロパティは保持する。

`runConversion({model,outputDir,converters})` はPromiseで結果を返す。convertersは `mode: 'real'|'mock'`、`intermediateToIfc(model)`、`intermediateToScene(model)` を持つ。同期・非同期可。変換器ごとに入力を複製する。z座標や階高を加算しない。null geometryとunresolvedは警告に残す。元ID・source・statusをmanifestに記録し、推定を確定へ変更しない。

IFC戻り値は `{ifcText:string,issues:Issue[]}`、sceneはJSON互換オブジェクト。scene.issuesがあれば統合する。変換不能要素の理由は担当2のissuesに依存し、IFC内の全IDを独立検査するものではない。

## 保存

model.ifc、scene.json、manifest.jsonを同一親の一時フォルダへ書き、最後にrenameする。協調CLI間は隣接する `.bim-lock` ディレクトリで排他する。通常の例外では一時ファイルとロックを削除する。強制終了・電源断では残る可能性があり、自動削除しない。非協調プロセスとの競合・クラッシュ耐性は保証しない。

manifestは `bim-conversion-manifest/1`。入力の解析済みJSON直列化と成果物のSHA-256、元要素の状態、issues、converterModeを持つ。warning/errorがあればpartial。completeは警告がない意味で、設計確定ではない。mockでも終了コード0となるためconverterModeを確認する。

## Claude等のツール契約

tool-definition.jsonは静的なツール定義。外部API呼出、キー登録、図面送信はない。ホスト側は引数schemaを検証し、利用者の許可した入出力ルートに実パスを制限する。モデルから任意の変換モジュールやコマンドを受け付けない。

シェル文字列を作らず `spawn(process.execPath, [absoluteCliPath, '--input', input_path, '--output', output_dir], {shell:false})` のように起動し、cwdはリポジトリに固定する。stdoutのJSONと終了コードを回収し、tool_resultの内容へJSONを渡す。非0ならis_error=true。partialではissuesを説明する。実データを外部モデルへ渡す可否は利用者の権限に従う。

## 接続・引継ぎ

cli.mjsは `../conversion/index.ts` の名前付きexport intermediateToIfc/intermediateToSceneを使用する。既存typescriptによる実行時transpileと相対拡張子省略の解決を行う。型検査は含まない。package/tsconfigは変更しない。

2026-11-08の確認時点で担当2のindex.tsは未着。実接続・実IFC/meshは未確認。依存注入のmockと実ファイル保存・CLI入出力を区別して確認した。担当2の入口完成後、契約fixtureでCLIを起動しconverterMode=realを確認する。ポーリング処理は置かない。

ハーネス：PASS

CLI：PASS

実変換接続：未実行

機械可読結果はevidence/result.xml、evidence/cli-result.xml。red.xmlは実装前の期待された失敗。evidence配下の生成物はテスト用合成データ。対象外の全体テスト・画面統合・公開は実施していない。
