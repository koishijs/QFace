import { mkdir, writeFile } from 'fs/promises'
import { resolve, extname } from 'path'
import { pathToFileURL } from 'url'
import type { BilibiliEmojiItem } from '../docs/types/BilibiliEmoji'

/**
 * 哔哩哔哩表情包资源生成器
 *
 * 使用批量 ID 扫描的公开 API（无需登录）：
 * https://api.bilibili.com/x/emote/package?business=reply&ids=1,2,...
 *
 * 下载到 public/assets/bilibili/{packageId}/{emojiId}.{ext}
 * 生成 public/assets/bilibili/_index.json 索引文件
 */

const ROOT_DIR = resolve(import.meta.dirname, '..')
const OUTPUT_DIR = resolve(ROOT_DIR, 'public/assets/bilibili')
const OUTPUT_INDEX = resolve(OUTPUT_DIR, '_index.json')

/** 扫描的 package ID 最大值 */
const MAX_SCAN_ID = 600
/** 每次批量请求的 ID 数量 */
const BATCH_SIZE = 30
/** 连续无结果的批次数达到此值则提前停止 */
const STOP_AFTER_EMPTY_BATCHES = 3
/** 跳过的分组 ID（如颜文字，纯文本无图片） */
const SKIP_PACKAGE_IDS = new Set([4])

const API_BASE =
  'https://api.bilibili.com/x/emote/package?business=reply&ids='

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Referer: 'https://www.bilibili.com',
  Origin: 'https://www.bilibili.com',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9',
}

// ──────────────────────────────────────────────────────────────
// 内部类型
// ──────────────────────────────────────────────────────────────

interface ApiEmote {
  id: number
  package_id: number
  text: string
  url: string
  gif_url?: string
  mtime: number
  type: number
  attr: number
}

interface ApiPackage {
  id: number
  text: string
  url: string
  mtime: number
  type: number
  attr: number
  emote?: ApiEmote[]
}

// ──────────────────────────────────────────────────────────────
// 工具函数
// ──────────────────────────────────────────────────────────────

/** 从 URL 推断文件扩展名 */
function inferExt(url: string, fallback = '.png'): string {
  try {
    const ext = extname(new URL(url).pathname)
    return ext || fallback
  } catch {
    return fallback
  }
}

/** 返回相对于 public/ 的路径（assets/ 开头，用 / 分隔） */
function toRelativePath(absPath: string): string {
  const publicDir = resolve(ROOT_DIR, 'public')
  return absPath
    .replace(publicDir, '')
    .replace(/^[\\/]/, '')
    .replace(/\\/g, '/')
}

/** 判断是否为有效的 http/https URL */
function isValidHttpUrl(str: string): boolean {
  try {
    const u = new URL(str)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/** 下载单张图片 */
async function downloadImage(url: string, destPath: string): Promise<boolean> {
  if (!isValidHttpUrl(url)) return false
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS })
    if (!res.ok) {
      console.warn(`    ⚠️  HTTP ${res.status}: ${url}`)
      return false
    }
    const buffer = await res.arrayBuffer()
    await writeFile(destPath, Buffer.from(buffer))
    return true
  } catch (err) {
    console.warn(`    ⚠️  下载出错: ${url}`, String(err))
    return false
  }
}

/** 请求一批 package IDs */
async function fetchBatch(ids: number[]): Promise<ApiPackage[]> {
  const url = API_BASE + ids.join(',')
  const res = await fetch(url, { headers: FETCH_HEADERS })
  const json = (await res.json()) as {
    code: number
    data: { packages: ApiPackage[] | null }
  }
  if (json.code !== 0) {
    throw new Error(`API code=${json.code}`)
  }
  return json.data.packages ?? []
}

// ──────────────────────────────────────────────────────────────
// 扫描所有分组
// ──────────────────────────────────────────────────────────────

async function scanPackages(): Promise<ApiPackage[]> {
  const result: ApiPackage[] = []
  let emptyBatchCount = 0

  for (
    let start = 1;
    start <= MAX_SCAN_ID && emptyBatchCount < STOP_AFTER_EMPTY_BATCHES;
    start += BATCH_SIZE
  ) {
    const end = Math.min(start + BATCH_SIZE - 1, MAX_SCAN_ID)
    const ids = Array.from({ length: end - start + 1 }, (_, i) => start + i)
    const batch = await fetchBatch(ids)

    if (batch.length === 0) {
      emptyBatchCount++
    } else {
      emptyBatchCount = 0
      result.push(...batch)
      const names = batch.map((p) => p.text).join(', ')
      console.log(
        `  [${start}-${end}] 找到 ${batch.length} 个分组: ${names.slice(0, 80)}`,
      )
    }
  }

  return result
}

// ──────────────────────────────────────────────────────────────
// 主流程
// ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🚀 开始拉取哔哩哔哩表情包...')
  console.log(`📡 扫描 package ID 范围 1~${MAX_SCAN_ID}（批次=${BATCH_SIZE}）\n`)

  const packages = await scanPackages()
  console.log(`\n✅ 共找到 ${packages.length} 个表情包分组，开始下载图片...\n`)

  await mkdir(OUTPUT_DIR, { recursive: true })

  const allEmojis: BilibiliEmojiItem[] = []
  let totalDownloaded = 0
  let totalSkipped = 0

  for (const pkg of packages) {
    if (!pkg.emote?.length) continue
    if (SKIP_PACKAGE_IDS.has(pkg.id)) {
      console.log(`⏭️  跳过 [${pkg.id}] ${pkg.text}`)
      continue
    }

    const pkgDir = resolve(OUTPUT_DIR, String(pkg.id))
    await mkdir(pkgDir, { recursive: true })

    console.log(`📦 [${pkg.id}] ${pkg.text} (${pkg.emote.length} 个表情}`)

    // 下载分组封面图
    let packageCoverPath = pkg.url
    if (isValidHttpUrl(pkg.url)) {
      const coverExt = inferExt(pkg.url, '.png')
      const coverDest = resolve(pkgDir, `cover${coverExt}`)
      const coverOk = await downloadImage(pkg.url, coverDest)
      if (coverOk) packageCoverPath = toRelativePath(coverDest)
    }

    for (const emote of pkg.emote) {
      const item: BilibiliEmojiItem = {
        packageId: pkg.id,
        packageName: pkg.text,
        packageCover: packageCoverPath,
        id: emote.id,
        text: emote.text,
        url: emote.url,
        gifUrl: emote.gif_url || undefined,
      }

      // 下载静态图（跳过非图片 URL，如颜文字纯文本）
      if (!isValidHttpUrl(emote.url)) {
        allEmojis.push(item)
        continue
      }

      const staticExt = inferExt(emote.url, '.png')
      const staticDest = resolve(pkgDir, `${emote.id}${staticExt}`)
      const staticOk = await downloadImage(emote.url, staticDest)
      if (staticOk) {
        item.path = toRelativePath(staticDest)
        totalDownloaded++
      } else {
        totalSkipped++
      }

      // 下载 GIF（如有且与静态图不同）
      if (emote.gif_url && emote.gif_url !== emote.url) {
        const gifExt = inferExt(emote.gif_url, '.gif')
        const gifDest = resolve(pkgDir, `${emote.id}${gifExt}`)
        const gifOk = await downloadImage(emote.gif_url, gifDest)
        if (gifOk) {
          item.gifPath = toRelativePath(gifDest)
        }
      }

      allEmojis.push(item)
    }
  }

  // 写入索引
  await writeFile(OUTPUT_INDEX, JSON.stringify(allEmojis, null, 2))

  console.log(`\n✅ 全部完成！`)
  console.log(`   表情包分组: ${packages.length} 个`)
  console.log(`   表情总数:   ${allEmojis.length} 个`)
  console.log(`   成功下载:   ${totalDownloaded} 张`)
  console.log(`   下载失败:   ${totalSkipped} 张`)
  console.log(`   索引文件:   ${OUTPUT_INDEX}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('❌ 执行失败:', err)
    process.exit(1)
  })
}
