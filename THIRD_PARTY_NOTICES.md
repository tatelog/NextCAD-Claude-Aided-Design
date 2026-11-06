# 第三者のソフトウェアの表示

このアプリは、次の第三者のソフトウェアを使っています。`package.json` の `dependencies`（アプリが実行時に使うもの）の全部です。
「版」は、いま入っているもの（`node_modules`）の版です。「指定」は `package.json` の指定で、`^` は範囲の指定です。
ライセンス本文は `licenses/` に置いてあります。

| 名前 | 版 | 指定 | ライセンス | 著作権表示 | ライセンス本文 |
|---|---|---|---|---|---|
| @react-three/drei | 10.7.9 | ^10.7.9 | MIT | Copyright (c) 2020 react-spring | `licenses/react-three-drei-LICENSE.txt` |
| @react-three/fiber | 9.8.2 | ^9.8.2 | MIT | Copyright (c) 2019-2025 Poimandres（※下の注） | `licenses/react-three-fiber-LICENSE.txt` |
| docx-preview | 0.4.1 | 0.4.1 | Apache License 2.0 | Copyright Volodymyr Baydalka | `licenses/docx-preview-LICENSE.txt` |
| jszip | 3.10.2 | 3.10.2 | MIT と GPL-3.0-or-later から選ぶ（このアプリは MIT を選ぶ） | Copyright (c) 2009-2016 Stuart Knightley, David Duponchel, Franz Buchinger, António Afonso | `licenses/jszip-LICENSE.markdown` |
| maplibre-gl | 6.15.0 | 6.15.0 | BSD-3-Clause | Copyright (c) 2023, MapLibre contributors | `licenses/maplibre-gl-LICENSE.txt` |
| proj4 | 2.22.0 | ^2.22.0 | MIT | Copyright (c) 2014, Mike Adair, Richard Greenwood, Didier Richard, Stephen Irons, Olivier Terral and Calvin Metcalf | `licenses/proj4-LICENSE.md` |
| react | 19.3.1 | ^19.3.1 | MIT | Copyright (c) Meta Platforms, Inc. and affiliates. | `licenses/react-LICENSE.txt` |
| react-dom | 19.3.1 | ^19.3.1 | MIT | Copyright (c) Meta Platforms, Inc. and affiliates. | `licenses/react-dom-LICENSE.txt` |
| sql.js | 1.15.2 | ^1.15.2 | MIT | Copyright (c) 2017 sql.js authors (see AUTHORS) | `licenses/sql.js-LICENSE.txt` |
| three | 0.187.0 | ^0.187.0 | MIT | Copyright © 2010-2026 three.js authors | `licenses/three-LICENSE.txt` |
| zod | 4.6.7 | ^4.6.7 | MIT | Copyright (c) 2025 Colin McDonnell | `licenses/zod-LICENSE.txt` |
| zustand | 5.0.16 | ^5.0.16 | MIT | Copyright (c) 2019 Paul Henschel | `licenses/zustand-LICENSE.txt` |

注:
- この表は直接の依存だけです。その先の依存（依存の依存）は含みません。配布するときは、ビルドの結果（`dist/`）に入っているものを別途確かめてください。
- 開発だけに使う道具（`devDependencies`。Vite・Vitest・TypeScript など）は、この表に入れていません。アプリのコードは実行時にそれらを読みません。
- `@react-three/fiber` の配布物（npm）には LICENSE の本文が入っていません。`licenses/react-three-fiber-LICENSE.txt` は、上流リポジトリ（https://github.com/pmndrs/react-three-fiber）の LICENSE を 2026-11-06 に取得したものです。

## docx-preview

- 配布元: https://github.com/VolodymyrBaydalka/docxjs （npm: `docx-preview`）
- 用途: 記入した Word の様式（第二号・第三号）を、ページごとに画面へ描く。
- NOTICE: 配布物に NOTICE は含まれていない（2026-11-06 に確認）。

## jszip

- 配布元: https://github.com/Stuk/jszip （npm: `jszip`）
- ライセンス: jszip は MIT と GPL-3.0-or-later の二つから選んで使える。このアプリは **MIT** を選んで使う（GPL-3.0-or-later は選ばない）。
- 用途: docx-preview が Word の中身（zip）を読むために使う。
