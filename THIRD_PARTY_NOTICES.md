# 第三者のソフトウェアの表示

このアプリは、次の第三者のソフトウェアを使っています。版は `package.json` で固定しています（`^` を付けない）。

| 名前 | 版 | ライセンス | ライセンスの本文 |
|---|---|---|---|
| docx-preview | 0.4.1 | Apache License 2.0 | `licenses/docx-preview-LICENSE.txt` |
| jszip | 3.10.2 | MIT（このアプリは MIT を選んで使う） | `licenses/jszip-LICENSE.markdown` |

## docx-preview

- 配布元: https://github.com/VolodymyrBaydalka/docxjs （npm: `docx-preview`）
- 著作権: Copyright Volodymyr Baydalka
- 用途: 記入した Word の様式（第二号・第三号）を、ページごとに画面へ描く。
- NOTICE: 配布物に NOTICE は含まれていない（2026-11-06 に確認）。

## jszip

- 配布元: https://github.com/Stuk/jszip （npm: `jszip`）
- ライセンス: jszip は MIT と GPL-3.0-or-later の二つから選んで使える。このアプリは **MIT** を選んで使う（GPL-3.0-or-later は選ばない）。
- 用途: docx-preview が Word の中身（zip）を読むために使う。
- 著作権（MIT の本文より）: Copyright (c) 2009-2016 Stuart Knightley, David Duponchel, Franz Buchinger, António Afonso
