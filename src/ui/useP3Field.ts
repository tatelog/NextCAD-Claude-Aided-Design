// P3 の入力の一つを、店舗から読み、店舗へ書く（useState と同じ形）。画面を離れて戻っても、入れた値が残る（統括の依頼 2026-11-06。依頼 3）。
import { useCallback } from 'react'
import { useP3Input, type P3InputValues } from '../store/p3Input'

type Next<T> = T | ((prev: T) => T)

export function useP3Field<K extends keyof P3InputValues>(key: K): [P3InputValues[K], (next: Next<P3InputValues[K]>) => void] {
  const value = useP3Input((s) => s.values[key])
  const set = useCallback(
    (next: Next<P3InputValues[K]>) => {
      const prev = useP3Input.getState().values[key]
      const resolved = typeof next === 'function' ? (next as (p: P3InputValues[K]) => P3InputValues[K])(prev) : next
      useP3Input.getState().setValue(key, resolved)
    },
    [key],
  )
  return [value, set]
}
