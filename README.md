# Next CAD — Claude Aided Design

**CAD の C を、Computer から Claude へ。**

手で描いた線に Claude が意味を返し、敷地から確認申請の書類までを一つの流れで通す、RC 造マンションの計画ツール

このプロジェクトは、RC造の集合住宅を計画する設計者の、BIMの入力作業と、申請に要る情報を国や自治体の資料から手で拾い集める手間を、手で描いた線にClaudeが意味を返し、国の公開データから法規のチェックと申請書類までを決定論の計算でつなぐことで変える、ブラウザのアプリ「Next CAD」です。

| | |
|---|---|
| 動かして見る（審査員用） | https://claude-aided-design-relay.ishikawa-yutaka.workers.dev |
| ログイン | 不要。そのまま使えます（江東区のデータ入り） |
| デモ動画（3 分） | 準備中 |
| 開発の記録（Claude Artifacts） | https://claude.ai/artifact/481QiF7X81wJnwyR8in53k — 企画・主張・要件・設計の問い詰めの記録・エビデンス・工程・タスク・セッション台帳。Claude Code の複数のセッションと一緒に、このハブで計画と判断を回しました |
| テーマ | あなたにしかない深さを |
| 制作 | 個人 1 名（Built with Claude: Japan 2026） |

> **Summary (EN)**
> Next CAD (Claude Aided Design) is a browser tool for planning a slab-type reinforced-concrete apartment block in Koto-ku, Tokyo. Pick a site on a map, draw the outline and the column grid by hand, and get a 3D volume cut by setback lines, a floor plan with unit layouts, a rough cost estimate, and permit documents written into Tokyo's Word forms (which the user loads; the forms are not bundled).
> Claude proposes meanings for hand-drawn lines and candidate ordinance values with sources, and operates the app through chat; every reply is forced into a fixed schema and checked before use. All dimensions and legal checks are deterministic code, tested against the national statutes (e-Gov). Final legal judgment stays with the architect and the reviewing body.

## 解く課題

集合住宅の計画の初期には、敷地の条件を調べ、斜線と容積で建てられる形を探り、住戸を割り付け、概算を出し、最後に確認申請の書類をそろえます。今はこの工程ごとに道具が分かれていて、つなぐのは人の手作業です。

- **形を決める所**: BIM は、形を決める前から正確な入力を求めます。設計者が手で描いて考える自由が、入力の作業に置き換わっています。
- **法規と申請の所**: 国の法令・地図・建物のデータは公開されています。ところが、確認申請で要る形にはつながっていません。どの書類が要り、どの欄に何を書くかは、人が条文と様式を突き合わせて拾っています。

Next CAD は、形を決める所をすべて手で描くところから始めます。システムは描いた線に意味を返し、人はそれを見て描き直します。その形から先の法規のチェック・数量・書類は、決定論の計算でつなぎます。

## できること

画面は 敷地（P1）→ ボリューム（P2）→ 平面（P3）→ 積算（P4）→ 出力（P5）の順に進みます。各画面の「次へ」を押した所まで、次のタブが開きます。保存した案件を開いたときは、全部のタブが開きます。

| 画面 | 手で描く所 | システムが返す所 |
|---|---|---|
| **P1 敷地** | 地図で敷地を選ぶ（住所でも探せる） | 筆界・用途地域・建蔽率・容積率・辺ごとの前面道路の候補を取り込む。周辺の建物（半径 400 m）を立体で出す |
| **P2 ボリューム** | 外形を手で描く（直線・曲線）。描き直す | 階数と階高で押し出し、道路・隣地・北側の斜線で切った 3D にする。食い込みは赤で示す。冬至の影、地図、周辺建物を重ねて見られる。筆界の辺に番号を付け、「道路に平行に合わせる」で外形の線を回せる |
| **P3 平面** | 通り（柱割り）と住戸の外形を描く | 階段 2 か所・共用廊下・EV・縦シャフトを配置し、住戸を割り付ける。住戸には、自作の 39 案の間取りを当てはめて描く。面積・水回り・動線・家具の条件を満たさない候補は、戸数に数えない |
| **P4 積算** | 単価表（CSV、出典付き）を置く | 保存した平面から数量を拾い、単価を掛けて区分ごとの概算を出す。RC の柱・梁の断面の候補を仮定付きで出す。出典の無い単価や拾えていない項目には「未確定」の印を付ける |
| **P5 出力** | 東京都の Word の様式を読み込む | 必要な図書を一覧にし、「作成できる」「追加の情報が要る」「作成候補（未実装）」「外部で用意」の 4 つに分ける。様式に申請者と設計の値を記入し、様式のまま画面で見せる。配置図・各階平面図・日影図・付近見取図・床面積求積図を PDF にする。IFC（IFC2X3）と合わせて ZIP で保存する |

P1〜P4 の右にはチャットがあり、Claude に画面の操作を頼めます（例:「階数を 4 にして」）。

## Claude の使いどころ

### アプリの中

Claude は次の 3 つの経路だけで使います。API キーは Cloudflare Worker の Secrets にあり、ブラウザからは Claude の API を直接呼びません。モデルは Worker 側で `claude-haiku-5-5` に固定しています。

| 経路 | 何をするか | 返答の扱い |
|---|---|---|
| 線の意味づけ（`/classify`） | 描いた線に、意味の候補を付ける | tool use の JSON スキーマで形を強制する。合わなければ 1 回だけ再試行し、それでも合わなければ保留にする。結果は「提案（要確認）」として人が確かめる |
| 条例値の補完（`/ordinance`） | 日影の条例の値の候補を、出典付きで出す | 同じく形を強制して検査する。本文に無い値・出典の読めない値は捨てる。人が出典を確かめて確定する |
| チャット（`/chat`） | 画面の操作を頼む | Worker 側の固定の道具の定義だけを使う。返った操作の列を、アプリが検査してから実行する |

**意味の候補を出すのは Claude まで**です。寸法・斜線・日影・建蔽率と容積率・図書の要否は、Claude を使わず決定論の計算で決めます。Claude の出力を、そのまま寸法にはしません。

### 作る過程

このリポジトリは、Claude Code で 1 週間でイチから書きました。
- 統括のセッション 1 つが、開発・調査・設計の問い詰め（grilling）・動画の子セッションに作業を割り振り、報告を受けて、取り込み・試験・push を回しました（セッション間のメッセージ、Remote Control、git worktree）。
- 法令の調査は、子セッションに e-Gov の法令 API で建築基準法・同施行令・同施行規則・消防法・建築士法を照合させました。その結果を、条文の出典付きのデータ（`src/law/permitSources.json`）にしました。
- 試験は仕様から先に書きました（Vitest、約 3,300 件）。
- フックで、過去に書いた同じ領域のコードの参照と、秘匿ファイルの混入を機械的に止めました。

## どこまで確実か

1 週間でイチから作る条件で、RC 造の板状マンションを、東京都江東区の公開データで、敷地から確認申請書まで最後まで通すことに絞りました。対象を広げて途中で止まるより、1 つの型を確実に通す方が価値があると判断したためです。敷地の取得、斜線と日影、住戸の割り付け、積算、様式への記入は部品ごとに分けてあり、別の構造形式や自治体へは部品を足して広げられます。

**決定論の計算と試験で確かめているもの**
- 斜線の式は建築基準法 第 56 条・別表第三のとおりで、数値で照合しています。
- 図書の要否と様式の欄は、e-Gov の現行の条文に当てて、出典を記録しています。

**人が補う所（このアプリが自動で決めないもの）**
- **条例の値**（日影規制の時間、測定面の高さなど）: 自治体ごとの例規集にあり、統合されたデータがありません。Claude が出典付きで候補を出し、人が出典を確かめて確定します。
- **消防法の要件、構造計算・代理申請・BIM 申請・認定部材の有無で決まる書類**: 一覧で「要確認」として理由付きで出します。
- **条文の改正の新旧の比較**: PDF でしか出ていないため、取り込んでいません。

**このアプリは法的な適合を保証しません。** どの式で、どの条文に当てて、どの出典の値で計算したかを示し、最後の判断を建築士と確認検査機関に返す道具です。

## 技術と動作環境

| 層 | 使ったもの |
|---|---|
| 画面 | React 19 / TypeScript / Vite |
| 手描きの入力 | Canvas 2D + Pointer Events（指・マウス・ペンを同じに扱う）。実寸 mm の座標と画面 px の座標を分けて持つ |
| 3D | three.js / React Three Fiber / Drei |
| 地図 | MapLibre GL JS（国土地理院の地理院タイル） |
| 座標・幾何 | proj4 / polygon-clipping |
| 状態・検査 | Zustand / Zod |
| 出力 | jsPDF / svg2pdf.js / JSZip / docx-preview（様式の表示）。IFC は自前で書き出す |
| Claude の中継・配信 | Cloudflare Workers（KV で月の件数を数える） |
| 試験 | Vitest |

ブラウザで動きます（PC・タブレット）。手元で動かすには Node.js が要ります（準備スクリプトは Node.js 24 以上）。

## 動かし方

### 1. 手元で動かす

```bash
npm install
npm run dev        # 開発サーバー（Vite）
npm test           # 試験（Vitest）
npm run build      # 型チェックと本番ビルド（dist/ を作る）
```

手元の開発では Worker の URL が空なので、Claude への要求（線の意味づけ・条例の補完・チャット）は送られません。それ以外の画面は動きます。

### 2. Worker を配備する（Claude の中継と、アプリの配信）

Worker は利用者自身の Cloudflare アカウントに配備します。`wrangler` は `package.json` に入っていないので、`npx` で使います。

```bash
npm run build                                 # wrangler.toml の [assets] が dist/ を配る
npx wrangler login
npx wrangler kv namespace create USAGE        # 月の件数を数える置き場。出た id を wrangler.toml の [[kv_namespaces]] に書く
npx wrangler secret put ANTHROPIC_API_KEY     # 値は対話で入れる。リポジトリにもチャットにも書かない
npx wrangler deploy
```

- `wrangler.toml` の `[vars]` で、接続元（`ALLOWED_ORIGIN`、アプリの URL）と月の上限（`MONTHLY_CLASSIFY_LIMIT`、件数）を決めます。上限は 3 つの経路の合計に効きます。
- Worker のルート: `POST /classify`、`POST /ordinance`、`POST /chat`、`GET /plateau-assets/…`（PLATEAU のデータの取得を中継する）。
- アプリがどの Worker につながるかは `VITE_WORKER_URL`（URL。秘密ではない）で決まります。空のときは、配備したアプリでは同じ場所を使い、手元の開発では送りません。
- API キーは、README にもソースにも書きません。

## データ

**リポジトリには、地図・筆・建物・道路のデータを入れていません。** 第三者のデータを公開リポジトリに置かないためです。手元で動かすときは、`public/local-data/`（`.gitignore` で除外）に利用者が置くと P1 が読みます。置かなければ、その層は「未取得」と出ます。

| ファイル | 中身 | 元 |
|---|---|---|
| `roads-koto.json` | 道路。`{ "roads": [{ "w": 幅員区分（1〜5）, "c": 道路分類, "g": [[経度, 緯度], …] }] }` | 国土数値情報（道路） |
| `koto-parcels.geojson` | 筆。プロパティに 地図名・筆ID・地番 など | 登記所備付地図データ（江東区） |
| `buildings-koto.geojson.gz` | 建物。ポリゴンと高さ `h`（m） | PLATEAU の建物 |

```bash
node scripts/prepare-local-data.ts --roads <道路の GeoJSON> --buildings <建物の GML かフォルダ> --parcels <変換済みの筆の GeoJSON>
```

筆の XML は、mojxml（Python のツール）で GeoJSON にしてから `--parcels` に渡します。

**審査員用の URL には、江東区の範囲を加工したデータを入れています。** 筆（登記所備付地図データ）・建物（PLATEAU）・道路（国土数値情報 N13、CC BY 4.0）は、いずれも出典を示せば加工・再配布できる公開データです。画面の出典に「加工して作成した」旨を示しています。

**東京都の Word の様式は、リポジトリにも審査員用の URL にも入れていません。** 都の頁の規約で、無断での複製と転用が認められていないためです。P5 の「様式の取り込み」で、使う人が東京都都市整備局の頁から取得した docx を読み込みます。読み込んだ様式は画面の中だけに持ち、どこへも送りません。

## 出典と利用条件

| 情報 | 出典と取得先 | 状態 |
|---|---|---|
| 地図（基図） | 国土地理院 地理院タイル（標準地図）。https://maps.gsi.go.jp/development/ichiran.html | 確認済み。出典を画面に表示 |
| 道路 | 国土数値情報（道路）令和6年度。https://nlftp.mlit.go.jp/ksj/other/agreement_01.html | 確認済み |
| 筆 | 登記所備付地図データ（江東区・2026年版、法務省）。https://www.moj.go.jp/MINJI/minji05_00494.html | 確認済み。筆界は参考値（法務上の境界ではない） |
| 建物 | 国土交通省 PLATEAU。https://www.mlit.go.jp/plateau/site-policy/ | 確認済み |
| 住所検索 | 国土地理院 住所検索 API。https://msearch.gsi.go.jp/address-search/AddressSearch | 利用条件は未確認（画面に表示） |
| 法令 | e-Gov 法令 API（建築基準法・同施行令・同施行規則、消防法、建築士法）。https://laws.e-gov.go.jp/ | 条文の出典はデータごとに記録（`src/law/permitSources.json`） |
| 東京都の様式 | 東京都都市整備局「建築基準法施行規則様式」。https://www.toshiseibi.metro.tokyo.lg.jp/kenchiku_kaihatsu/kenchiku_gyosei/gyosei/kijun/kn/k12 | 配らない。使う人が取得する |

出典の一覧と確認の状態は `src/data/sources.ts` が正です。アプリが実行時に使う依存の版・ライセンス・著作権表示は `THIRD_PARTY_NOTICES.md` に、ライセンスの本文は `licenses/` にあります。

## 制約と未完成

- **日影**: 条例の値は、人が出典を付けて入れ、確認したものだけを使います。人が入れるまで日影規制は「未判定」です。
- **積算**: 既定の単価表は仮置きの例です。直接仮設・共通仮設・現場管理費・一般管理費は含めません。柱・梁の断面は仮定付きの候補で、構造設計の確定値ではありません。
- **様式**: 第二号と第三号は、記入できる欄が一部です。第八号は最終の確認が済んでいません。
- **図面**: 立面図・断面図・床伏図は作っていません（図書の一覧に「作成候補（未実装）」と出ます）。
- **IFC**: 書き出しだけです（読み込みは無い）。
- **計算の時間**: 平面の「余り面積の少ない寸法案を計算」は、候補を総当たりするため 1 分以上かかることがあります。
- **住戸の割り付けの空き**: 外形の端に、住戸 1 戸に満たない空きが残ることがあります。住戸を端まで引き延ばして埋める試作は枝 `claude/area-fill-wip` にあり、計算を軽くしてから取り込みます。この件の試験 1 件は失敗のまま残しています。
- **地図**: 郵便番号での検索は未対応です。筆界は参考値です。
- **端末**: iPad の実機での操作は未確認です。

## 提出後の計画

今は、案件を JSON と工程ごとの状態で保存しています。提出後に、敷地から出力までを案件ごとの SQLite 一つにまとめ、採用した値・出典・版・確認の状態を残す形に組み替えます（未着手）。

## ライセンス

MIT（[LICENSE](LICENSE)）

## 開発に OpenAI Codex も併用したこと

このリポジトリには、OpenAI Codex が書いたコミットが含まれます（作者が Codex のものと、末尾に `Co-Authored-By: Codex` があるもの。枝 `codex/…`）。

- **理由**: 開発に使っていた Claude の Max プラン（5x）は、11 月 6 日（金）の朝の時点で週の上限に達していました。追加のクレジット（API）も、同じ金曜日の時点で 500 ドルを超えて消費していました。締切までの残りの実装を進めるため、11 月 6 日の夜から Codex を併用しました。
- **範囲**: 画面と平面の一部の実装（住戸の間取りの当てはめ、共用動線の自動配置、ボリューム計画、チュートリアル、画面の整理など）です。統括のセッション（Claude Code）が取り込み・試験・本番の配備を受け持ち、Codex の変更も同じ試験を通してから取り込みました。
- **アプリの中で使う AI は Claude だけ**です（線の意味づけ・条例値の補完・チャット。Worker から claude-haiku-5-5 を呼ぶ）。
- Codex が書いたコードも、ビルド期間（2026-11-02 12:30 以降）に新しく書いたものです。
