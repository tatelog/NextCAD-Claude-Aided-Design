// 仕様: 意味づけの店舗（ハブ A-03 G13・G14・G65、D-04 共通部品「意味づけの結果表示」「要確認の修正」）。
// 仕様 1: 線（Segment）の id ごとに、種類（KINDS のどれか）・状態（確定・要確認）・誰が（人・Claude）を持つ。はじめは何も持たない。
// 仕様 2（種類を選ぶ）: 人が種類を選ぶと、その線の割り当ては「選んだ種類・確定・人」になる。選び直せば上書きする。ほかの線は変わらない。
// 仕様 3（この種類で確定）: 要確認の線に、いまの種類をもう一度選ぶと、種類は変わらず確定になる。
// 仕様 4（要確認の印）: 種類を持つ線にだけ付く。種類は消えず、誰がも変わらない。種類を持たない線には何も作らない。
// 仕様 5（未分類に戻す）: その線の割り当てだけが無くなる。
// 仕様 6（全部消す）: 全部の割り当てが無くなる。
// 仕様 7: Claude の判定は未接続。どの操作でも、誰が は人だけ。
// 仕様 8: 操作のたびに新しい状態を作る（前に取った状態は書き換えない）。
import { beforeEach, describe, expect, it } from 'vitest'
import { KINDS } from '../plan/semantic'
import { useSemantic } from './semantic'

const get = () => useSemantic.getState()

describe('意味づけの店舗', () => {
  beforeEach(() => useSemantic.setState({ assignments: {} }))

  describe('はじめの状態', () => {
    it('何も持たない', () => {
      expect(useSemantic.getInitialState().assignments).toEqual({})
    })
  })

  describe('種類を選ぶ（人、確定）', () => {
    it('人が種類を選ぶと、その線は「選んだ種類・確定・人」になる', () => {
      get().setKind('s1', 'wall')
      expect(get().assignments['s1']).toEqual({ kind: 'wall', status: 'confirmed', by: 'human' })
    })

    it.each(KINDS)('種類 %s を選べる', (kind) => {
      get().setKind('s1', kind)
      expect(get().assignments['s1']).toEqual({ kind, status: 'confirmed', by: 'human' })
    })

    it('選び直すと上書きする。ほかの線は変わらない', () => {
      get().setKind('s1', 'wall')
      get().setKind('s2', 'column')
      get().setKind('s1', 'beam')
      expect(get().assignments['s1']).toEqual({ kind: 'beam', status: 'confirmed', by: 'human' })
      expect(get().assignments['s2']).toEqual({ kind: 'column', status: 'confirmed', by: 'human' })
    })

    it('線ごとに別々の種類を持つ', () => {
      get().setKind('s1', 'wall')
      get().setKind('s2', 'room')
      expect(Object.keys(get().assignments).sort()).toEqual(['s1', 's2'])
      expect(get().assignments['s1']?.kind).toBe('wall')
      expect(get().assignments['s2']?.kind).toBe('room')
    })

    it('要確認の線に別の種類を選ぶと、その種類で確定になる', () => {
      get().setKind('s1', 'wall')
      get().markNeedsReview(['s1'])
      get().setKind('s1', 'beam')
      expect(get().assignments['s1']).toEqual({ kind: 'beam', status: 'confirmed', by: 'human' })
    })
  })

  describe('この種類で確定（種類を変えずに確定にする）', () => {
    it('要確認の線に、いまの種類をもう一度選ぶと、種類は変わらず確定になる', () => {
      get().setKind('s1', 'wall')
      get().markNeedsReview(['s1'])
      expect(get().assignments['s1']?.status).toBe('needs_review')
      get().setKind('s1', 'wall')
      expect(get().assignments['s1']).toEqual({ kind: 'wall', status: 'confirmed', by: 'human' })
    })
  })

  describe('要確認の印', () => {
    it('種類を持つ線に付けると、状態だけが要確認になる。種類と誰がは変わらない', () => {
      get().setKind('s1', 'column')
      get().markNeedsReview(['s1'])
      expect(get().assignments['s1']).toEqual({ kind: 'column', status: 'needs_review', by: 'human' })
    })

    it('種類を持たない線には、何も作らない', () => {
      get().markNeedsReview(['s1'])
      expect(get().assignments).toEqual({})
      expect('s1' in get().assignments).toBe(false)
    })

    it('まとめて付けると、種類を持つ線だけに付く', () => {
      get().setKind('a', 'wall')
      get().setKind('c', 'beam')
      get().markNeedsReview(['a', 'b', 'c'])
      expect(get().assignments['a']).toEqual({ kind: 'wall', status: 'needs_review', by: 'human' })
      expect(get().assignments['c']).toEqual({ kind: 'beam', status: 'needs_review', by: 'human' })
      expect('b' in get().assignments).toBe(false)
    })

    it('指した線のほかの線は、確定のまま変わらない', () => {
      get().setKind('a', 'wall')
      get().setKind('b', 'room')
      get().markNeedsReview(['a'])
      expect(get().assignments['a']?.status).toBe('needs_review')
      expect(get().assignments['b']).toEqual({ kind: 'room', status: 'confirmed', by: 'human' })
    })

    it('印を付けた線に、重ねて付けても同じ', () => {
      get().setKind('a', 'wall')
      get().markNeedsReview(['a'])
      get().markNeedsReview(['a'])
      expect(get().assignments['a']).toEqual({ kind: 'wall', status: 'needs_review', by: 'human' })
    })

    it('空の一覧では何も変わらない', () => {
      get().setKind('a', 'wall')
      get().markNeedsReview([])
      expect(get().assignments['a']).toEqual({ kind: 'wall', status: 'confirmed', by: 'human' })
    })

    it('いまの店舗に無い線の id（消えた線）を渡しても、何も作らない', () => {
      get().setKind('a', 'wall')
      get().markNeedsReview(['gone'])
      expect(Object.keys(get().assignments)).toEqual(['a'])
    })
  })

  describe('未分類に戻す（その線の種類を消す）', () => {
    it('その線の割り当てだけが無くなる', () => {
      get().setKind('a', 'wall')
      get().setKind('b', 'room')
      get().clearKind('a')
      expect('a' in get().assignments).toBe(false)
      expect(get().assignments['b']).toEqual({ kind: 'room', status: 'confirmed', by: 'human' })
    })

    it('要確認の線も消せる', () => {
      get().setKind('a', 'wall')
      get().markNeedsReview(['a'])
      get().clearKind('a')
      expect(get().assignments).toEqual({})
    })

    it('種類を持たない線に使っても、何も起きない', () => {
      get().setKind('a', 'wall')
      get().clearKind('nothing')
      expect(get().assignments).toEqual({ a: { kind: 'wall', status: 'confirmed', by: 'human' } })
    })
  })

  describe('全部消す', () => {
    it('全部の割り当てが無くなる', () => {
      get().setKind('a', 'wall')
      get().setKind('b', 'room')
      get().markNeedsReview(['b'])
      get().clear()
      expect(get().assignments).toEqual({})
    })

    it('何も無いときに使っても、空のまま', () => {
      get().clear()
      expect(get().assignments).toEqual({})
    })

    it('消したあとに、また種類を選べる', () => {
      get().setKind('a', 'wall')
      get().clear()
      get().setKind('a', 'beam')
      expect(get().assignments['a']).toEqual({ kind: 'beam', status: 'confirmed', by: 'human' })
    })
  })

  describe('誰が（Claude の判定は未接続）', () => {
    it('どの操作のあとでも、誰が は人だけ', () => {
      get().setKind('a', 'wall')
      get().setKind('b', 'room')
      get().setKind('c', 'beam')
      get().markNeedsReview(['a', 'b'])
      get().setKind('b', 'room')
      get().clearKind('c')
      const by = Object.values(get().assignments).map((x) => x.by)
      expect(by.length).toBeGreaterThan(0)
      expect(new Set(by)).toEqual(new Set(['human']))
    })
  })

  describe('前に取った状態を書き換えない', () => {
    it('種類を選んでも、選ぶ前に取った割り当ては変わらない', () => {
      get().setKind('a', 'wall')
      const before = get().assignments
      get().setKind('a', 'beam')
      get().setKind('b', 'room')
      expect(before).toEqual({ a: { kind: 'wall', status: 'confirmed', by: 'human' } })
      expect(get().assignments).not.toBe(before)
    })

    it('印を付けても、付ける前に取った割り当ては変わらない', () => {
      get().setKind('a', 'wall')
      const before = get().assignments
      const beforeA = before['a']
      get().markNeedsReview(['a'])
      expect(before['a']).toBe(beforeA)
      expect(before['a']).toEqual({ kind: 'wall', status: 'confirmed', by: 'human' })
      expect(get().assignments).not.toBe(before)
    })

    it('消しても、消す前に取った割り当ては変わらない', () => {
      get().setKind('a', 'wall')
      get().setKind('b', 'room')
      const before = get().assignments
      get().clearKind('a')
      get().clear()
      expect(Object.keys(before).sort()).toEqual(['a', 'b'])
    })
  })
})
