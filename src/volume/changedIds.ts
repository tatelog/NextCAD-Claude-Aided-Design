// 中身が変わった線の id（ハブ A-03 G114、設計グリルの項目 8）。つまみで動かした線を、判定し直す印の材料にする。決定論。
// 同じ id の線で中身（端点など）が変わったものだけ返す。増えた・消えた id は返さない。入力は書き換えない。

/** 中身の比べ方: 同じ id の線で、JSON の文字が違えば変わったとみる（端点などの値の差） */
export function changedIds<T extends { id: string }>(before: readonly T[], after: readonly T[]): string[] {
  const old = new Map(before.map((s) => [s.id, JSON.stringify(s)]))
  const out: string[] = []
  for (const s of after) {
    const prev = old.get(s.id)
    if (prev !== undefined && prev !== JSON.stringify(s)) out.push(s.id)
  }
  return out
}
