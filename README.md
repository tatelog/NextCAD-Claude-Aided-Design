# built-with-claude-japan-2026-toyo

Built with Claude: Japan 2026 の提出作品です（個人 1 名）。

> **Summary (EN)**
> A browser tool for designing a slab-type reinforced-concrete apartment block in Koto-ku, Tokyo. Pick a site on a map, draw the outline and the grid by hand, and get a 3D volume with setback checks, a floor plan with unit counts, a rough cost estimate, and the list of permit documents with a Word-form viewer.
> Claude proposes meanings for hand-drawn lines and candidate ordinance values, and returns chat operations; each reply is checked against a fixed schema. Every dimension and legal check is deterministic code.
> No public data is bundled. Users place it under `public/local-data/` (see below).

## 作ったもの

RC 造の板状マンションの計画を、敷地から出力まで一つの流れで通す Web アプリです。対象は江東区（13108）です。

- **主張**: 形は、人が手で描くところから始まります。システムは描いた線に意味（候補）を返し、人が見て描き直します。
- **流れ**: 敷地（P1）→ ボリューム（P2）→ 平面（P3）→ 積算（P4）→ 出力（P5）。

## Claude の使いどころ

Claude は次の 3 つの経路だけで使います。API キーは Cloudflare Worker の Secrets にあり、ブラウザからは Claude の API を直接呼びません。

| 経路 | 何をするか | 返答の扱い |
|---|---|---|
| 線の意味づけ（`/classify`） | 描いた線に、意味の候補を付ける | tool use のスキーマで形を強制する。合わなければ 1 回だけ再試行し、それでも合わなければ保留にする。結果は「提案（要確認）」として人が確かめる |
| 条例値の補完（`/ordinance`） | 日影の条例の値の候補を出す（出典を付ける） | 同じく形を強制して検査する。人が出典を確かめて確定する |
| チャット（`/chat`） | 画面の操作を頼む | Worker 側の固定の道具の定義だけを使う。返った操作の列を、アプリが検査してから実行する |

寸法・斜線・日影・建ぺい率と容積率・図書の要否は、Claude を使わず、決定論の計算で決めます。Claude の出力を、そのまま寸法にはしません。

## 画面の流れ

| 画面 | できること | 状態 |
|---|---|---|
| **P1 敷地** | 国土地理院の標準地図で敷地を選ぶ。住所から探す。道路・筆・建物（LOD1）は、データを置いてあれば重ねる。周辺建物（基準点から半径 400m）を出す。地図を傾けると建物が立体で見える | 郵便番号での検索は未対応（入力欄は出るが案内を出す）。住所検索の利用条件は未確認 |
| **P2 ボリューム** | 外形を手で描く（直線モード・曲線モード）。閉じると外形になる。階数と階高で押し出す。道路・隣地・北側の斜線で切り取る。3D で、斜線の面と食い込み（赤）、冬至の影を切り替えて見る | 北側の斜線には真北の入力が要る。日影規制は条例の値を人が入れるまで「未判定」 |
| **P3 平面** | 通り（柱割り）を描き、スパンの寸法を確かめる。廊下の両側の住戸候補から住戸数を出す | 区画の作り方と既定のスパンは仮置き |
| **P4 積算** | 数量と単価から、区分ごとの概算を出す。単価は出典を付けて CSV で置く | 既定の単価表は仮置き（出典のない行には未確定の印）。数量は外壁と屋根の一部だけ P2 の外形から拾い、残りは人が入れる。躯体と外構は数量を拾えていない |
| **P5 出力** | IFC（STEP 形式）を書き出す（壁と階。書き出しのみ）。確認申請の図書の一覧を、要る・要らない（理由）・要確認（理由）で出す。Word の様式を取り込み、どの値をどの欄に入れるかを表で確かめる | 立面図・断面図は図を作っていない（一覧に出るだけ）。第八号は欄の一覧と、一部の欄だけ。様式への書き出しは、ロジックまで作ってあり、画面にはまだ出していない |

P1〜P4 の右にはチャットがあります（P5 にはありません）。

## 動かし方

### 1. アプリを手元で動かす

```bash
npm install
npm run dev        # 開発サーバー（Vite）
npm test           # テスト（Vitest）
npm run build      # 型チェックと本番ビルド（dist/ を作る）
```

手元の開発では、Worker の URL が空なので、判定（線の意味づけと条例の補完）は送られません。

### 2. Worker を配備する（Claude の中継と、アプリの配信）

Worker は利用者自身の Cloudflare アカウントに配備します。`wrangler` は `package.json` に入っていないので、利用者が用意してください。

```bash
npm run build                               # wrangler.toml の [assets] が dist/ を配る
npx wrangler login
npx wrangler d1 create cad-masters          # 空のデータベース。出た id を wrangler.toml の database_id に書く
npx wrangler secret put ANTHROPIC_API_KEY   # 値は対話で入れる。リポジトリには書かない
npx wrangler deploy
```

- `ALLOWED_ORIGIN`（アプリの接続元の URL）は、Cloudflare のダッシュボードの変数に入れます。
- 月の件数の上限は、KV の名前空間（binding 名 `USAGE`）を作り、`wrangler.toml` の該当の行を外すと効きます。作らない間は、上限は効きません。上限の既定の件数は仮置きです。
- Worker のルート: `POST /classify`、`POST /ordinance`、`POST /chat`、`GET /plateau-assets/…`（PLATEAU のデータの取得を中継する）。
- アプリがどの Worker につながるかは、`VITE_WORKER_URL`（URL。秘密ではない）で決まります。空のときは、配備したアプリでは同じ場所を使い、手元の開発では送りません。
- 手元で Worker を動かす手順は、この README では確かめていません。

## データの置き方（利用者が置く）

データはリポジトリに入れていません。`public/local-data/`（`.gitignore` で除外）に置くと、P1 が読みます。置かなければ、その層は「未取得」と出ます。

| ファイル | 中身 | 元 |
|---|---|---|
| `roads-koto.json` | 道路。`{ "roads": [{ "w": 幅員区分（1〜5）, "c": 道路分類, "g": [[経度, 緯度], …] }] }` | 国土数値情報（道路） |
| `koto-parcels.geojson` | 筆。プロパティに 地図名・筆ID・地番 など。位置が付くのは公共座標系のシートだけ | 登記所備付地図データ（江東区） |
| `buildings-koto.geojson.gz` | 建物。ポリゴンと、プロパティ `h`（高さ、m）。gzip でも展開済みの JSON でもよい | PLATEAU の建物 |

準備スクリプト（簡易版。Node.js 24 以上で、TypeScript のまま実行します）:

```bash
node scripts/prepare-local-data.ts --roads <道路の GeoJSON> --buildings <建物の GML かフォルダ> --parcels <変換済みの筆の GeoJSON>
```

筆の XML は、mojxml（Python のツール）で GeoJSON にしてから `--parcels` に渡します。指定しなかった入力は作りません。

**東京都の Word の様式は、置きません。** P5 の「様式の取り込み」で、使う人が自分で取得した docx を選んで読み込みます。読み込んだものは画面の中だけに持ち、どこへも送りません。様式は東京都都市整備局の頁から取得してください（頁の利用規約では、無断での複製と転用は認められていません）。

**リポジトリに入れない理由**: この公開リポジトリには、生データも、再配布の条件が確かめられていないデータも入れない方針だからです。データの取得と変換は、利用者が行います。

## 出典と利用条件

| 情報 | 出典と取得先 | 状態 |
|---|---|---|
| 地図（基図） | 国土地理院 地理院タイル（標準地図）。https://maps.gsi.go.jp/development/ichiran.html | 確認済み。出典を画面に表示 |
| 道路 | 国土数値情報（道路）令和6年度。https://nlftp.mlit.go.jp/ksj/other/agreement_01.html | 確認済み |
| 筆 | 登記所備付地図データ（江東区・2026年版、法務省）。https://www.moj.go.jp/MINJI/minji05_00494.html | 確認済み。筆界は参考値（法務上の境界ではない） |
| 建物 | 国土交通省 PLATEAU。https://www.mlit.go.jp/plateau/site-policy/ | 確認済み |
| 住所検索 | 国土地理院 住所検索 API。https://msearch.gsi.go.jp/address-search/AddressSearch | 利用条件は未確認（画面に表示） |
| 法令 | e-Gov 法令 API（建築基準法・同施行令・同施行規則、消防法、建築士法）。https://laws.e-gov.go.jp/ | 条文の出典は、データごとに記録（`src/law/permitSources.json`） |
| 東京都の様式 | 東京都都市整備局「建築基準法施行規則様式」。https://www.toshiseibi.metro.tokyo.lg.jp/kenchiku_kaihatsu/kenchiku_gyosei/gyosei/kijun/kn/k12 | 配らない。使う人が取得する |

出典の一覧と確認の状態は、`src/data/sources.ts` が正です。

第三者のソフトウェア: docx-preview（Apache License 2.0）と jszip（MIT を選んで使用）。ライセンスの本文は `licenses/`、表示は `THIRD_PARTY_NOTICES.md` です。

## 制約と未完成

- **日影**: 条例の値は、人が出典を付けて入れ、確認したものだけを使います。江東区の日影の一覧のデータは作ってありますが、画面からはまだ使っていません（テストだけで使っています）。
- **積算**: 単価表は仮置きの例です。出典のない行には未確定の印を付けています。数量の拾い出しは一部だけです。
- **様式**: 第二号と第三号は、記入できる欄が一部です。第八号は欄の一覧と、一部の欄だけです。
- **立面図・断面図**: 図は作っていません。図書の一覧に出るだけです。
- **IFC**: 階と壁だけを書き出します。読み込みはありません。
- **Claude の API への接続**: 線の意味づけと条例の補完は、実際の API に繋いだ確認をまだしていないと、コードの注に明記しています。チャットを含め、配備したうえでの確認は、この README を書いた時点では済んでいません。
- **郵便番号での検索**: 未対応です。
- **筆界**: 参考値です。法務上の境界を示すものではありません。
- **住所検索**: 利用条件が未確認です。
- **iPad の実機での操作**: 未確認です。
- **ライセンスの表示**: `THIRD_PARTY_NOTICES.md` には、docx-preview と jszip だけを載せています。MapLibre GL JS など、ほかの依存関係の表示は、まだ追加していません。

## ライセンス

MIT（[LICENSE](LICENSE)）。
