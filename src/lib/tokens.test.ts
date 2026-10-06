import { describe, expect, it } from 'vitest'
import { canMergeAt, canSplitAt, mergeAt, splitAt } from './tokens'
import type { CardCode } from './cards'

describe('splitAt / canSplitAt', () => {
  it('splits TH into T and H', () => {
    const tokens: CardCode[] = ['TH']
    expect(canSplitAt(tokens, 0)).toBe(true)
    expect(splitAt(tokens, 0)).toEqual(['T', 'H'])
  })

  it('splits QU into Q and U', () => {
    const tokens: CardCode[] = ['QU']
    expect(canSplitAt(tokens, 0)).toBe(true)
    expect(splitAt(tokens, 0)).toEqual(['Q', 'U'])
  })

  it('splits CL into C and L', () => {
    const tokens: CardCode[] = ['CL']
    expect(canSplitAt(tokens, 0)).toBe(true)
    expect(splitAt(tokens, 0)).toEqual(['C', 'L'])
  })

  it('splits ER into E and R', () => {
    const tokens: CardCode[] = ['ER']
    expect(canSplitAt(tokens, 0)).toBe(true)
    expect(splitAt(tokens, 0)).toEqual(['E', 'R'])
  })

  it('splits IN into I and N', () => {
    const tokens: CardCode[] = ['IN']
    expect(canSplitAt(tokens, 0)).toBe(true)
    expect(splitAt(tokens, 0)).toEqual(['I', 'N'])
  })

  it('preserves surrounding tokens when splitting mid-word', () => {
    const tokens: CardCode[] = ['T', 'TH', 'I', 'N']
    expect(splitAt(tokens, 1)).toEqual(['T', 'T', 'H', 'I', 'N'])
  })

  it('cannot split a single letter', () => {
    const tokens: CardCode[] = ['A']
    expect(canSplitAt(tokens, 0)).toBe(false)
    expect(splitAt(tokens, 0)).toEqual(['A'])
  })

  it('returns an unchanged copy for an out-of-range index', () => {
    const tokens: CardCode[] = ['TH', 'I', 'N']
    expect(canSplitAt(tokens, -1)).toBe(false)
    expect(canSplitAt(tokens, 5)).toBe(false)
    expect(splitAt(tokens, 5)).toEqual(['TH', 'I', 'N'])
    expect(splitAt(tokens, 5)).not.toBe(tokens)
  })
})

describe('mergeAt / canMergeAt', () => {
  it('merges T and H into TH', () => {
    const tokens: CardCode[] = ['T', 'H']
    expect(canMergeAt(tokens, 0)).toBe(true)
    expect(mergeAt(tokens, 0)).toEqual(['TH'])
  })

  it('merges Q and U into QU', () => {
    const tokens: CardCode[] = ['Q', 'U']
    expect(canMergeAt(tokens, 0)).toBe(true)
    expect(mergeAt(tokens, 0)).toEqual(['QU'])
  })

  it('merges C and L into CL', () => {
    const tokens: CardCode[] = ['C', 'L']
    expect(canMergeAt(tokens, 0)).toBe(true)
    expect(mergeAt(tokens, 0)).toEqual(['CL'])
  })

  it('merges E and R into ER', () => {
    const tokens: CardCode[] = ['E', 'R']
    expect(canMergeAt(tokens, 0)).toBe(true)
    expect(mergeAt(tokens, 0)).toEqual(['ER'])
  })

  it('merges I and N into IN', () => {
    const tokens: CardCode[] = ['I', 'N']
    expect(canMergeAt(tokens, 0)).toBe(true)
    expect(mergeAt(tokens, 0)).toEqual(['IN'])
  })

  it('does not merge a non-mergeable adjacent pair', () => {
    const tokens: CardCode[] = ['T', 'I']
    expect(canMergeAt(tokens, 0)).toBe(false)
    expect(mergeAt(tokens, 0)).toEqual(['T', 'I'])
  })

  it('does not merge across an already-double card', () => {
    const tokens: CardCode[] = ['TH', 'I', 'N']
    // tokens[0] is a double card, not a single letter, so it cannot merge.
    expect(canMergeAt(tokens, 0)).toBe(false)
  })

  it('preserves surrounding tokens when merging mid-word', () => {
    const tokens: CardCode[] = ['T', 'I', 'N', 'S']
    expect(mergeAt(tokens, 1)).toEqual(['T', 'IN', 'S'])
  })

  it('returns an unchanged copy for an out-of-range index', () => {
    const tokens: CardCode[] = ['T', 'H']
    expect(canMergeAt(tokens, -1)).toBe(false)
    expect(canMergeAt(tokens, 1)).toBe(false)
    expect(canMergeAt(tokens, 5)).toBe(false)
    expect(mergeAt(tokens, 5)).toEqual(['T', 'H'])
    expect(mergeAt(tokens, 5)).not.toBe(tokens)
  })
})
