import { mkdir, readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'
import { pathToFileURL } from 'url'
import type { QqSysEmojiWithAssets } from '../docs/types/QqSysEmoji'
import {
  qqEmojiToUnified,
  type UnifiedEmojiPackage,
  type UnifiedEmojiPackageMeta,
} from '../docs/types/UnifiedEmoji'

/**
 * QQNT 系统表情统一索引生成器
 *
 * 读取 public/assets/qq_emoji/_index.json（QqSysEmojiWithAssets 平铺列表），
 * 全部归入单一分组（packageId = '0'），映射为 UnifiedEmojiPackage 格式：
 *   - public/indexes/qq/_index.json  → 包摘要列表
 *   - public/indexes/qq/0.json       → 完整包数据（含所有 emojis）
 */

const ROOT_DIR = resolve(import.meta.dirname, '..')
const SOURCE_INDEX = resolve(ROOT_DIR, 'public/assets/qq/_index.json')
const OUTPUT_DIR = resolve(ROOT_DIR, 'public/indexes/qq')

const QQ_PACKAGE_ID = '0'
const QQ_PACKAGE_NAME = 'QQNT 系统表情'

async function main(): Promise<void> {
  console.log('📖 读取源索引:', SOURCE_INDEX)

  const raw = await readFile(SOURCE_INDEX, 'utf-8')
  const allItems: QqSysEmojiWithAssets[] = JSON.parse(raw)

  console.log(`✅ 共 ${allItems.length} 条表情数据\n`)

  // QQ 平铺列表没有包分组，统一归入 packageId='0'
  const pkg: UnifiedEmojiPackage = {
    id: QQ_PACKAGE_ID,
    name: QQ_PACKAGE_NAME,
    coverUrl: undefined,
    emojis: allItems.map((item) =>
      qqEmojiToUnified({
        emojiId        : item.emojiId,
        describe       : item.describe,
        qzoneCode      : item.qzoneCode,
        qcid           : item.qcid,
        emojiType      : item.emojiType,
        aniStickerPackId: item.aniStickerPackId,
        aniStickerId   : item.aniStickerId,
        associateWords : item.associateWords,
        isHide         : item.isHide,
        startTime      : item.startTime,
        endTime        : item.endTime,
        animationWidth : item.animationWidth,
        animationHeigh : item.animationHeigh,
        assets         : item.assets.map((a) => ({
          type: a.type,
          name: a.name,
          path: a.path,
        })),
      }),
    ),
  }

  await mkdir(OUTPUT_DIR, { recursive: true })

  // 写入完整包数据
  const pkgPath = resolve(OUTPUT_DIR, `${QQ_PACKAGE_ID}.json`)
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2))

  // 写入摘要索引
  const metas: UnifiedEmojiPackageMeta[] = [
    {
      id    : pkg.id,
      name  : pkg.name,
      count : pkg.emojis.length,
    },
  ]
  const metaPath = resolve(OUTPUT_DIR, 'index.json')
  await writeFile(metaPath, JSON.stringify(metas, null, 2))

  console.log(`📦 [${QQ_PACKAGE_ID}] ${QQ_PACKAGE_NAME} → ${pkg.emojis.length} 个表情 → 0.json`)
  console.log(`\n✅ 全部完成！`)
  console.log(`   表情总数: ${pkg.emojis.length}`)
  console.log(`   输出目录: ${OUTPUT_DIR}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('❌ 执行失败:', err)
    process.exit(1)
  })
}
