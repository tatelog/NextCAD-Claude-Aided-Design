// 作業履歴の CSV 書き出し（ハブ A-03 G68）。1 行 = 時刻・画面・操作・対象・前→後・誰。決定論。
// 値に、カンマ・改行・二重引用符があれば、二重引用符で囲み、中の二重引用符は二つにする（CSV の規則）。
// 先頭に BOM を付けて、表計算ソフトで文字化けしないようにする。

/** 作業履歴の CSV に出す項目 */
export interface WorkLogCsvRow {
  at: string
  screen: string
  action: string
  target: string
  change: string
  who: string
}

const HEADER = ['時刻', '画面', '操作', '対象', '前→後', '誰']
const BOM = '﻿'

function cell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

/** 作業履歴の行を CSV の文字列にする（見出しは先頭。行は渡された順） */
export function workLogToCsv(rows: readonly WorkLogCsvRow[]): string {
  const lines = [HEADER, ...rows.map((r) => [r.at, r.screen, r.action, r.target, r.change, r.who])]
  return `${BOM}${lines.map((line) => line.map(cell).join(',')).join('\n')}\n`
}
