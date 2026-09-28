import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  historyDirName,
  historySortKey,
  parseHistoryDirName,
  parseResourceTimestamp,
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

  it('archives files dropped by the new variant', () => {
    const plan = planEmojiSync(
      files({ '1/png/1.png': 'a' }),
      files({ '1/png/1.png': 'a', '1/apng/1.png': 'x' })
    )
    assert.deepEqual(plan, { copy: [], archive: ['1/apng/1.png'] })
  })
})

describe('parseResourceTimestamp', () => {
  it('reads the timestamp from base and adv urls', () => {
    const base =
      'https://wa.qq.com/qgif-web-permanent/sysemoji/v1/singleres/494_base_1789715609.zip'
    assert.equal(parseResourceTimestamp(base), 1789715609)
    assert.equal(
      parseResourceTimestamp(base.replace('_base_', '_adv_')),
      1789715609
    )
  })

  it('handles emoji-character ids and rejects unknown urls', () => {
    assert.equal(
      parseResourceTimestamp('https://x/singleres/😍_base_1712825561.zip'),
      1712825561
    )
    assert.equal(parseResourceTimestamp(''), undefined)
  })
})

describe('history dir names', () => {
  it('uses the published timestamp when known', () => {
    assert.equal(historyDirName(1755499209, 1766043611), '1755499209')
    assert.deepEqual(parseHistoryDirName('1755499209'), {
      publishedAt: 1755499209,
    })
  })

  it('falls back to the replacing timestamp when unknown', () => {
    assert.equal(historyDirName(undefined, 1766043611), 'before-1766043611')
    assert.deepEqual(parseHistoryDirName('before-1766043611'), {
      replacedAt: 1766043611,
    })
  })

  it('rejects legacy version-named directories', () => {
    assert.throws(() => parseHistoryDirName('6.9.86-42941'))
  })

  it('sorts by published time, else replaced time', () => {
    const names = ['before-1766043611', '1712825561']
    const sorted = names
      .map(parseHistoryDirName)
      .sort((a, b) => historySortKey(b) - historySortKey(a))
    assert.deepEqual(sorted, [
      { replacedAt: 1766043611 },
      { publishedAt: 1712825561 },
    ])
  })
})
