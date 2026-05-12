import { mkdir, readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'
import { pathToFileURL } from 'url'
import type { BilibiliEmojiItem } from '../docs/types/BilibiliEmoji'
import {
  biliEmojiToUnified,
  type UnifiedEmojiPackage,
  type UnifiedEmojiPackageMeta,
} from '../docs/types/UnifiedEmoji'

/**
 * 哔哩哔哩表情包统一索引生成器
 *
 * 读取 public/assets/bilibili_emoji/_index.json，
 * 按 packageId 分组映射为 UnifiedEmojiPackage 格式：
 *   - public/indexes/bilibili/_index.json  → 所有包的摘要列表
 *   - public/indexes/bilibili/{id}.json    → 单包完整数据（含 emojis）
 */

const ROOT_DIR = resolve(import.meta.dirname, '..')
const SOURCE_INDEX = resolve(ROOT_DIR, 'public/assets/bilibili_emoji/_index.json')
const OUTPUT_DIR = resolve(ROOT_DIR, 'public/indexes/bilibili')

async function main(): Promise<void> {
  console.log('📖 读取源索引:', SOURCE_INDEX)

  const raw = await readFile(SOURCE_INDEX, 'utf-8')
  const allItems: BilibiliEmojiItem[] = JSON.parse(raw)

  console.log(`✅ 共 ${allItems.length} 条表情数据\n`)

  // 按 packageId 分组，保持插入顺序
  const packageMap = new Map<string, UnifiedEmojiPackage>()
  for (const item of allItems) {
    const pid = String(item.packageId)
    if (!packageMap.has(pid)) {
      packageMap.set(pid, {
        id: pid,
        name: item.packageName,
        coverUrl: item.packageCover || undefined,
        emojis: [],
      })
    }
    packageMap.get(pid)!.emojis.push(biliEmojiToUnified(item))
  }

  await mkdir(OUTPUT_DIR, { recursive: true })

  const metas: UnifiedEmojiPackageMeta[] = []

  for (const [pid, pkg] of packageMap) {
    // 写入分组完整数据
    const outPath = resolve(OUTPUT_DIR, `${pid}.json`)
    await writeFile(outPath, JSON.stringify(pkg, null, 2))

    metas.push({
      id: pkg.id,
      name: pkg.name,
      coverUrl: pkg.coverUrl,
      count: pkg.emojis.length,
    })

    console.log(`📦 [${pid}] ${pkg.name} → ${pkg.emojis.length} 个表情 → ${pid}.json`)
  }

  // 按 packageId 数值升序写入总摘要
  metas.sort((a, b) => Number(a.id) - Number(b.id))
  const metaPath = resolve(OUTPUT_DIR, 'index.json')
  await writeFile(metaPath, JSON.stringify(metas, null, 2))

  console.log(`\n✅ 全部完成！`)
  console.log(`   分组数:   ${metas.length}`)
  console.log(`   表情总数: ${allItems.length}`)
  console.log(`   输出目录: ${OUTPUT_DIR}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('❌ 执行失败:', err)
    process.exit(1)
  })
}
