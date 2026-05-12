import { mkdir, readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'
import { pathToFileURL } from 'url'
import type { WechatNewEmojiItem } from '../docs/types/WechatNewEmoji'
import {
  type UnifiedEmoji,
  type UnifiedEmojiPackage,
  type UnifiedEmojiPackageMeta,
} from '../docs/types/UnifiedEmoji'

/**
 * 微信表情统一索引生成器
 *
 * 读取 public/assets/wechat/_index.json（WechatNewEmojiItem 平铺列表），
 * 全部归入单一分组（packageId = '0'），映射为 UnifiedEmojiPackage 格式：
 *   - public/indexes/wechat/index.json  → 包摘要列表
 *   - public/indexes/wechat/0.json      → 完整包数据（含所有 emojis）
 */

const ROOT_DIR = resolve(import.meta.dirname, '..')
const SOURCE_INDEX = resolve(ROOT_DIR, 'public/assets/wechat/_index.json')
const OUTPUT_DIR = resolve(ROOT_DIR, 'public/indexes/wechat')

const WECHAT_PACKAGE_ID = '0'
const WECHAT_PACKAGE_NAME = '微信表情'

function wechatEmojiToUnified(item: WechatNewEmojiItem): UnifiedEmoji {
  const description =
    item.cnValue?.trim() ||
    item.enValue?.trim() ||
    item.qqValue?.trim() ||
    String(item.eggIndex)

  const shortCodes = [item.key]
  if (item.cnValue?.trim()) shortCodes.push(item.cnValue.trim())
  if (item.qqValue?.trim() && item.qqValue !== item.key)
    shortCodes.push(item.qqValue.trim())

  return {
    id: String(item.eggIndex),
    description,
    shortCodes,
    staticUrl: item.path || '',
    isHide: false,
    packageId: WECHAT_PACKAGE_ID,
    meta: {
      key: item.key,
      cnValue: item.cnValue,
      qqValue: item.qqValue,
      enValue: item.enValue,
      twValue: item.twValue,
      thValue: item.thValue,
      fileName: item.fileName,
    },
  }
}

async function main(): Promise<void> {
  console.log('📖 读取源索引:', SOURCE_INDEX)

  const raw = await readFile(SOURCE_INDEX, 'utf-8')
  const allItems: WechatNewEmojiItem[] = JSON.parse(raw)

  console.log(`✅ 共 ${allItems.length} 条表情数据\n`)

  const pkg: UnifiedEmojiPackage = {
    id: WECHAT_PACKAGE_ID,
    name: WECHAT_PACKAGE_NAME,
    coverUrl: undefined,
    emojis: allItems.map(wechatEmojiToUnified),
  }

  await mkdir(OUTPUT_DIR, { recursive: true })

  // 写入完整包数据
  const pkgPath = resolve(OUTPUT_DIR, `${WECHAT_PACKAGE_ID}.json`)
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2))

  // 写入摘要索引
  const metas: UnifiedEmojiPackageMeta[] = [
    {
      id: pkg.id,
      name: pkg.name,
      count: pkg.emojis.length,
    },
  ]
  const metaPath = resolve(OUTPUT_DIR, 'index.json')
  await writeFile(metaPath, JSON.stringify(metas, null, 2))

  console.log(
    `📦 [${WECHAT_PACKAGE_ID}] ${WECHAT_PACKAGE_NAME} → ${pkg.emojis.length} 个表情 → 0.json`,
  )
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
