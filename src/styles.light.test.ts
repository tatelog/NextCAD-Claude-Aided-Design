// 仕様（統括の依頼 2026-11-05「暗い表示で P4 の数量の内訳が読めない」。直し方は明るい表示にそろえる。暗い表示への対応は未決）:
// 仕様 1（地）: アプリの地（html・body・#root）は、背景色の白を明示する。暗い表示の既定の地に任せない。
// 仕様 2（配色）: 配色は明るい表示に固定する（:root の color-scheme は light）。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8')

describe('明るい表示にそろえる（仕様 1・2）', () => {
  it('仕様 1: html・body・#root は、背景色の白を明示する', () => {
    expect(css).toMatch(/html,\s*body,\s*#root\s*\{[^}]*background(-color)?:\s*#fff\b/)
  })

  it('仕様 2: 配色は明るい表示に固定する（:root の color-scheme は light）', () => {
    expect(css).toMatch(/:root\s*\{[^}]*color-scheme:\s*light/)
  })
})
