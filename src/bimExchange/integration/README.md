# 保存平面から3D・IFCへの画面接続

2026-11-08。未コミットの共有チェックアウト。担当1/2の中間モデル・変換に接続。既存の配置を変更せず、保存済み階だけを処理する。

## 入口
P5「データ・図面の書き出し」→「平面から3Dモデルを作成」→「中間JSON・3D・IFCを ZIP で保存」。未確定の壁・開口へ概算寸法を使う場合だけチェックする。元データに実寸幅がない窓は描画と同じ中央半分の幅・位置を概算採用。柱断面・梁・階段詳細は補完しない。

出力は intermediate.json / scene.json / model.obj / model.ifc / manifest.json。mm・右手Z上。参照元の大きな保存版文字列はmanifest.sourceReferencesに一度だけ保持し、各要素ではsaved-plan-sourceを参照する。モデルの仮定/不明状態を維持。プレビューは同じmeshの投影。元の階配置・寸法を変更しない。条件や平面が変わると旧結果の保存を無効にする。

UIはBimExportPanel、独立した生成入口はexportSavedPlan。CLIはharness/cli.mjsで同じ中間JSONを使用する。担当2のhostElementId契約で扉・窓を親壁に紐付け、sceneは切欠き、IFCはIfcRelVoidsElementを保存する。共用部詳細や未定断面はissuesで追跡。

## 保存復元の修正
savedFloorPlansのコア検証をAutoCoreのid/evCountに合わせ、存在しないkindを必須にしない。Room.nameも元型と同じ任意にする。他の保存情報や未知属性は保持。

## 証跡
利用者の指示により、新規タブでチュートリアルを操作して17,000×60,000mmの案件を作成し、案件JSONを保存・再読込して出力。元の利用者タブには触れていない。
成果物と実操作抜粋動画はこのチャットのoutputs。生成後のZIPを独立IFCリーダーで開き、中間モデルの階・開口関係と比較。CLIも同じ中間JSONを実変換器へ渡して保存。
対象テスト：PASS
保存往復：PASS
画面出力：PASS
成果物読込：PASS
CLI：PASS
対象型確認：PASS

機械可読結果: work/bim-integration-final.json、bim-save-tests.json、bim-artifacts-tests.json、bim-final-artifact-tests.json、bim-scoped-typecheck.json、bim-cli-final2.json。
全体検証はFAIL。work/bim-final-typecheck.logのbuildingFrame未配置参照、work/bim-full-regression.jsonの旧床版厚150mm期待、配置・UI等の担当外不一致。担当外ファイルを変更して解消したものではない。全体成功とは報告しない。
未実施：本番公開、外部CADの実操作、構造・申請適合の確定。寸法未確定部材の補完・設計成立性判断は対象外。
