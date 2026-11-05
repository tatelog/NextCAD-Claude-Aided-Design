// 単価表（CSV の文字。ハブ A-03 G20・G136、t55 の積算の操作）。P4 の画面とチャットの操作が、同じ表を読み書きする。
// 既定の表は仮置きの例（出典は利用者が書く。G20）。チャットで変えた単価・歩掛には provisional の印を残す（G140。代表の確認待ち）。
import { create } from 'zustand'
import type { PriceRow } from '../estimate/estimate'

/**
 * 既定の単価表（例。出典は無い仮置き。G20）。出典の無い単価には未確定の印（provisional）を付ける（G22）。
 * 出典の欄に「利用者入力」と書くと、出典つきの単価に見えるため、出典なしと書く。
 */
export const PRICE_CSV_SAMPLE = [
  'id,kind,category,item,unit,unit_price,factor,source_ref,provisional,version',
  'cross,造作,内装,壁クロス,m2,1200,,出典なし（仮置き）,true,v1',
  'carpenter,労務,躯体,型枠大工,人,25000,0.3,出典なし（仮置き）,true,v1',
  'tile,造作,外装,外壁タイル,m2,8000,,出典なし（仮置き）,true,v1',
].join('\n')

export interface PriceTableState {
  /** 単価表の CSV の文字 */
  csv: string
  setCsv: (text: string) => void
}

export const usePriceTable = create<PriceTableState>((set) => ({
  csv: PRICE_CSV_SAMPLE,
  setCsv: (csv) => set({ csv }),
}))

/**
 * チャットで単価・歩掛を変えたとき、provisional の印を残すか。代表の確認待ち（G140）。
 * 分岐はこの一か所だけ。印を残す側で作ってある。
 */
export function provisionalAfterChatChange(): boolean {
  return true
}

/** 行の一つを、チャットの変更で書き換えた行の並びにする（印は provisionalAfterChatChange に従う）。無い id は null */
export function changedRowsOf(rows: readonly PriceRow[], id: string, patch: Partial<Pick<PriceRow, 'unit_price' | 'factor'>>): PriceRow[] | null {
  if (!rows.some((r) => r.id === id)) return null
  return rows.map((r) => (r.id === id ? { ...r, ...patch, provisional: provisionalAfterChatChange() } : r))
}
