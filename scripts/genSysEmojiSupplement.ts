import { DatabaseSync } from 'node:sqlite'
import { writeFile } from 'fs/promises'
import { resolve } from 'path'
import { pathToFileURL } from 'url'
import type { QqSysEmojiGroup, QqSysEmojiItem } from '../docs/types/QqSysEmoji'

/**
 * 系统表情补充元数据生成器
 *
 * QQNT 新表情的元数据由服务端经登录会话下发，只落盘在加密的 nt_db/emoji.db 中；
 * 客户端自带的 face_config.json / default_config.json 不再更新。
 * 本脚本读取已解密的 emoji.db，生成 scripts/data/sys_emoji_supplement.json，
 * 供 gen:qqnt 合并（结构同 default_config.json）。
 *
 * 用法：pnpm gen:qqnt-supplement <解密后的 emoji.db>
 * emoji.db 须来自打开过表情面板的 GUI 客户端；无界面客户端（NapCat）的表是空的。
 */

const OUTPUT_RELATIVE_PATH = 'scripts/data/sys_emoji_supplement.json'

// base_sys_emoji_table 的列名是 QQNT 内部字段编号
const COL = {
  emojiId: '81211',
  describe: '81212',
  qzoneCode: '81213',
  qcid: '81214',
  emojiType: '81215',
  aniStickerPackId: '81216',
  aniStickerId: '81217',
  associateWords: '81220',
  animationWidth: '81224',
  animationHeigh: '81225',
  panelType: '81226',
  groupName: '81266',
} as const

type Row = Record<string, string | number | Uint8Array | null>

/**
 * 解码由若干「tag + 长度 + UTF-8 字符串」组成的 protobuf 重复字段
 * 截断的数据直接抛错，不返回半截结果
 */
export function decodeProtoStrings(buf: Uint8Array | null): string[] {
  if (!buf) {
    return []
  }
  const result: string[] = []
  let offset = 0
  const readVarint = () => {
    let value = 0
    let shift = 0
    for (;;) {
      if (offset >= buf.length) {
        throw new Error('Truncated protobuf varint')
      }
      const byte = buf[offset++]
      value += (byte & 0x7f) * 2 ** shift
      if (!(byte & 0x80)) {
        return value
      }
      shift += 7
    }
  }
  while (offset < buf.length) {
    readVarint() // field tag
    const length = readVarint()
    if (offset + length > buf.length) {
      throw new Error('Truncated protobuf string')
    }
    result.push(Buffer.from(buf.subarray(offset, offset + length)).toString('utf8'))
    offset += length
  }
  return result
}

// Same order as gen:qqnt: numeric ids first, then emoji-character ids
function compareEmojiIds(a: string, b: string): number {
  const na = Number(a)
  const nb = Number(b)
  if (isNaN(na) || isNaN(nb)) {
    return isNaN(na) && isNaN(nb) ? a.localeCompare(b) : isNaN(na) ? 1 : -1
  }
  return na - nb
}

const toNumber = (value: Row[string]) => (value == null ? 0 : Number(value))
const toText = (value: Row[string]) => (value == null ? '' : String(value))

export function rowToEmojiItem(row: Row): QqSysEmojiItem {
  return {
    emojiId: toText(row[COL.emojiId]),
    describe: toText(row[COL.describe]),
    qzoneCode: toText(row[COL.qzoneCode]),
    qcid: toNumber(row[COL.qcid]),
    emojiType: toNumber(row[COL.emojiType]),
    aniStickerPackId: toNumber(row[COL.aniStickerPackId]),
    aniStickerId: toNumber(row[COL.aniStickerId]),
    associateWords: decodeProtoStrings(
      (row[COL.associateWords] as Uint8Array | null) ?? null
    ),
    // 81221 是服务端的「完全隐藏」标记（如「隐藏表情」分组），与 isHide 沿用的
    // face_config QHide（不在经典面板显示）含义不同，不要映射过来
    isHide: false,
    startTime: '',
    endTime: '',
    animationWidth: toNumber(row[COL.animationWidth]),
    animationHeigh: toNumber(row[COL.animationHeigh]),
  }
}

function readSupplement(dbFile: string) {
  const db = new DatabaseSync(dbFile, { readOnly: true })
  try {
    const rows = db
      .prepare('SELECT * FROM base_sys_emoji_table')
      .all() as Row[]
    if (rows.length === 0) {
      throw new Error(
        'base_sys_emoji_table 为空：请使用打开过表情面板的 GUI 客户端的 emoji.db'
      )
    }

    // 按「面板类型 → 分组名」组织成 default_config.json 的结构；面板名只用于区分，gen:qqnt 不关心
    const panels: Record<string, { SysEmojiGroupList: QqSysEmojiGroup[] }> = {}
    const sorted = rows
      .map((row) => ({ row, item: rowToEmojiItem(row) }))
      .sort((a, b) => compareEmojiIds(a.item.emojiId, b.item.emojiId))
    for (const { row, item } of sorted) {
      const panelKey = `panelType${toText(row[COL.panelType]) || 'Unknown'}`
      const groupName = toText(row[COL.groupName])
      const groups = (panels[panelKey] ??= { SysEmojiGroupList: [] })
        .SysEmojiGroupList
      let group = groups.find((g) => g.groupName === groupName)
      if (!group) {
        group = { groupName, SysEmojiList: [] }
        groups.push(group)
      }
      group.SysEmojiList.push(item)
    }
    return { panels, count: rows.length }
  } finally {
    db.close()
  }
}

async function main(): Promise<void> {
  const dbFile = process.argv[2]
  if (!dbFile) {
    throw new Error('用法: pnpm gen:qqnt-supplement <解密后的 emoji.db>')
  }
  const { panels, count } = readSupplement(resolve(dbFile))
  const output = resolve(import.meta.dirname, '..', OUTPUT_RELATIVE_PATH)
  await writeFile(output, JSON.stringify(panels, null, 2) + '\n')
  console.log(`已写入 ${count} 个表情的元数据: ${output}`)
  console.log('接下来运行 pnpm gen:qqnt 合并进索引')
}

// Compare as URLs: a hand-built `file://${argv[1]}` never matches on Windows
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('生成失败:', error)
    process.exit(1)
  })
}
