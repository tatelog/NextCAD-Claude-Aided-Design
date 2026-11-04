// 防火地域・高度地区を、管理者（urf:custodian）で絞る（D-02 C4、ハブ E-82）。
// 残すのは対象の区の項目と「東京都」の項目（県の区域は全区に効く）。他の区の項目は捨てる。
// 管理者が不明（null）の項目は捨てず、unknownOwner に分けて返す（推測で残さない・捨てない）。
export const PREFECTURE_OWNER = '東京都'

export function ownedBy<T extends { custodian: string | null }>(
  items: readonly T[],
  wardName: string,
): { owned: T[]; unknownOwner: T[] } {
  const owned: T[] = []
  const unknownOwner: T[] = []
  for (const it of items) {
    if (it.custodian === null) unknownOwner.push(it)
    else if (it.custodian === wardName || it.custodian === PREFECTURE_OWNER) owned.push(it)
  }
  return { owned, unknownOwner }
}
