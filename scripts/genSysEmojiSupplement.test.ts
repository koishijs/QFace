import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { decodeProtoStrings, rowToEmojiItem } from './genSysEmojiSupplement'

// Field tag 81220 (wire type 2) as emitted by QQNT: a2 d4 27
const TAG = [0xa2, 0xd4, 0x27]
const encode = (...words: string[]) =>
  Uint8Array.from(
    words.flatMap((word) => {
      const bytes = [...Buffer.from(word, 'utf8')]
      return [...TAG, bytes.length, ...bytes]
    })
  )

describe('decodeProtoStrings', () => {
  it('decodes repeated length-delimited utf8 strings', () => {
    assert.deepEqual(decodeProtoStrings(encode('骰子', '摇骰子')), [
      '骰子',
      '摇骰子',
    ])
  })

  it('returns an empty list for null', () => {
    assert.deepEqual(decodeProtoStrings(null), [])
  })

  it('handles multi-byte length varints', () => {
    const word = '长'.repeat(50) // 150 bytes, length varint 0x96 0x01
    const bytes = [...Buffer.from(word, 'utf8')]
    const buf = Uint8Array.from([...TAG, 0x96, 0x01, ...bytes])
    assert.deepEqual(decodeProtoStrings(buf), [word])
  })

  it('throws on truncated input instead of returning garbage', () => {
    assert.throws(() => decodeProtoStrings(Uint8Array.from([...TAG, 5, 0x41])))
  })
})

describe('rowToEmojiItem', () => {
  it('maps numbered columns to emoji fields', () => {
    const item = rowToEmojiItem({
      '81211': '429',
      '81212': '/蛇年快乐',
      '81213': '10429',
      '81214': null,
      '81215': 3,
      '81216': 1,
      '81217': 56,
      '81220': encode('蛇年'),
      '81224': 192,
      '81225': 92,
    })
    assert.deepEqual(item, {
      emojiId: '429',
      describe: '/蛇年快乐',
      qzoneCode: '10429',
      qcid: 0,
      emojiType: 3,
      aniStickerPackId: 1,
      aniStickerId: 56,
      associateWords: ['蛇年'],
      isHide: false,
      startTime: '',
      endTime: '',
      animationWidth: 192,
      animationHeigh: 92,
    })
  })
})
