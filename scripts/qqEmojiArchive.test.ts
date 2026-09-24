import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  compareQqVersions,
  computeVariantSeen,
  computeVersionFields,
  planEmojiSync,
} from './qqEmojiArchive'

const files = (entries: Record<string, string>) =>
  new Map(Object.entries(entries))

describe('planEmojiSync', () => {
  it('copies new files', () => {
    const plan = planEmojiSync(files({ '1/png/1.png': 'a' }), files({}))
    assert.deepEqual(plan, { copy: ['1/png/1.png'], archive: [] })
  })

  it('does nothing for unchanged files', () => {
    const plan = planEmojiSync(
      files({ '1/png/1.png': 'a' }),
      files({ '1/png/1.png': 'a' })
    )
    assert.deepEqual(plan, { copy: [], archive: [] })
  })

  it('archives then copies changed files', () => {
    const plan = planEmojiSync(
      files({ '1/png/1.png': 'b' }),
      files({ '1/png/1.png': 'a' })
    )
    assert.deepEqual(plan, { copy: ['1/png/1.png'], archive: ['1/png/1.png'] })
  })

  it('archives files dropped from a still-present emoji', () => {
    const plan = planEmojiSync(
      files({ '1/png/1.png': 'a' }),
      files({ '1/png/1.png': 'a', '1/apng/1.png': 'x' })
    )
    assert.deepEqual(plan, { copy: [], archive: ['1/apng/1.png'] })
  })

  it('leaves a fully removed emoji untouched', () => {
    const plan = planEmojiSync(
      files({ '1/png/1.png': 'a' }),
      files({ '1/png/1.png': 'a', '2/png/2.png': 'b', '2/apng/2.png': 'c' })
    )
    assert.deepEqual(plan, { copy: [], archive: [] })
  })
})

describe('computeVersionFields', () => {
  const cur = '7.0.3-60000'

  it('sets firstSeenIn for an emoji never seen before', () => {
    assert.deepEqual(computeVersionFields(true, true, undefined, cur), {
      firstSeenIn: cur,
      lastSeenIn: cur,
    })
    // metadata-only entry in prev index gets assets for the first time
    assert.deepEqual(computeVersionFields(true, true, {}, cur), {
      firstSeenIn: cur,
      lastSeenIn: cur,
    })
  })

  it('keeps firstSeenIn and bumps lastSeenIn for a present emoji', () => {
    const prev = { firstSeenIn: '6.9.86-42941', lastSeenIn: '7.0.2-53644' }
    assert.deepEqual(computeVersionFields(true, true, prev, cur), {
      firstSeenIn: '6.9.86-42941',
      lastSeenIn: cur,
    })
  })

  it('keeps firstSeenIn absent for baseline emojis', () => {
    const prev = { lastSeenIn: '7.0.2-53644' }
    assert.deepEqual(computeVersionFields(true, true, prev, cur), {
      lastSeenIn: cur,
    })
  })

  it('marks removed and freezes versions when gone from source', () => {
    const prev = { firstSeenIn: '6.9.86-42941', lastSeenIn: '7.0.2-53644' }
    assert.deepEqual(computeVersionFields(false, true, prev, cur), {
      ...prev,
      removed: true,
    })
  })

  it('clears removed when an emoji comes back', () => {
    const prev = {
      firstSeenIn: '6.9.86-42941',
      lastSeenIn: '7.0.1-52892',
      removed: true as const,
    }
    assert.deepEqual(computeVersionFields(true, true, prev, cur), {
      firstSeenIn: '6.9.86-42941',
      lastSeenIn: cur,
    })
  })

  it('sets nothing for metadata-only entries', () => {
    assert.deepEqual(computeVersionFields(false, false, undefined, cur), {})
  })
})

describe('computeVariantSeen', () => {
  const prevSync = '7.0.2-53644'
  const cur = '7.0.3-60000'

  it('dates the replaced variant and the new current variant on first archive', () => {
    const result = computeVariantSeen(
      [prevSync],
      { firstSeenIn: '6.9.86-42941' },
      true,
      prevSync,
      cur
    )
    assert.equal(result.assetsFirstSeenIn, cur)
    assert.deepEqual([...result.historyFirstSeenIn], [[prevSync, '6.9.86-42941']])
  })

  it('carries the current variant date into history on a second archive', () => {
    const prev = {
      firstSeenIn: '6.9.86-42941',
      assetsFirstSeenIn: '7.0.1-52892',
      history: [{ lastSeenIn: '7.0.0-50000', firstSeenIn: '6.9.86-42941' }],
    }
    const result = computeVariantSeen(
      [prevSync, '7.0.0-50000'],
      prev,
      true,
      prevSync,
      cur
    )
    assert.equal(result.assetsFirstSeenIn, cur)
    assert.deepEqual(Object.fromEntries(result.historyFirstSeenIn), {
      [prevSync]: '7.0.1-52892',
      '7.0.0-50000': '6.9.86-42941',
    })
  })

  it('keeps dates unchanged when nothing is archived', () => {
    const prev = {
      assetsFirstSeenIn: '6.9.87-44204',
      history: [{ lastSeenIn: '6.9.86-42941' }],
    }
    const result = computeVariantSeen(['6.9.86-42941'], prev, false, prevSync, cur)
    assert.equal(result.assetsFirstSeenIn, '6.9.87-44204')
    assert.deepEqual([...result.historyFirstSeenIn], [['6.9.86-42941', undefined]])
  })

  it('drops assetsFirstSeenIn once all history is deleted', () => {
    const prev = {
      assetsFirstSeenIn: '6.9.87-44204',
      history: [{ lastSeenIn: '6.9.86-42941' }],
    }
    const result = computeVariantSeen([], prev, false, prevSync, cur)
    assert.equal(result.assetsFirstSeenIn, undefined)
  })
})

describe('compareQqVersions', () => {
  it('compares segment by segment numerically', () => {
    const sorted = ['7.0.2-53644', '6.9.87-44204', '6.9.98-51102', '6.9.9-1']
    sorted.sort(compareQqVersions)
    assert.deepEqual(sorted, [
      '6.9.9-1',
      '6.9.87-44204',
      '6.9.98-51102',
      '7.0.2-53644',
    ])
  })
})
