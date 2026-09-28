import { createHash } from 'crypto'
import { execFileSync } from 'child_process'
import { existsSync } from 'fs'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'fs/promises'
import { basename, dirname, relative, resolve, sep } from 'path'
import { pathToFileURL } from 'url'
import { unzipSync } from 'fflate'
import {
  type QqEmojiAssetKind,
  type QqEmojiAssetV2,
  type QqEmojiIndexV2,
  QqSysEmojiAssetType,
  type QqSysEmojiDefinition,
  type QqSysEmojiHistoryV2,
  type QqSysEmojiV2,
  type QqSysEmojiWithAssets,
} from '../docs/types/QqSysEmoji'
import {
  type AssetHashMap,
  fromIsoTime,
  historyDirName,
  historySortKey,
  parseHistoryDirName,
  parseResourceTimestamp,
  planEmojiSync,
  toIsoTime,
} from './qqEmojiArchive'

/**
 * QQ Emoji 资源生成器
 *
 * 1. 启动 docker/napcat 中的 NapCat，由插件按 id 逐个查询系统表情定义
 * 2. 按定义中的地址从公开 CDN 下载资源包，增量同步到 public/assets/qq_emoji：
 *    被替换的旧文件移入 <emojiId>/_history/<发布时间戳 | before-替换时间戳>/
 * 3. 生成索引：v2 为 QQ 原始定义加上本库字段；v1 保持旧结构
 *
 * 用法：pnpm gen:qqnt [--reuse]
 *   --reuse  复用 docker/napcat/data/definitions.json，不启动容器
 */

const ROOT = resolve(import.meta.dirname, '..')
const OUTPUT_DIR = resolve(ROOT, 'public/assets/qq_emoji')
const INDEX_V1_FILE = resolve(OUTPUT_DIR, '_index.json')
const INDEX_V2_FILE = resolve(OUTPUT_DIR, '_index.v2.json')
const NAPCAT_DIR = resolve(ROOT, 'docker/napcat')
const REQUEST_FILE = resolve(NAPCAT_DIR, 'data/request.json')
const DEFINITIONS_FILE = resolve(NAPCAT_DIR, 'data/definitions.json')
const CDN_CACHE_DIR = resolve(ROOT, '.cache/qq-emoji-cdn')
const HISTORY_DIR_NAME = '_history'
const WEBUI_URL = 'http://localhost:6100/webui?token=qface'

const DEFINITIONS_TIMEOUT_MS = 30 * 60_000
const DEFINITIONS_POLL_MS = 10_000
const DOWNLOAD_CONCURRENCY = 8

// 拷贝与索引时需要跳过的系统垃圾文件
const JUNK_FILE_NAMES = new Set(['.DS_Store', '__MACOSX', 'Thumbs.db'])

// 资源包内的目录名即资源类型
const ASSET_KINDS: QqEmojiAssetKind[] = ['png', 'apng', 'lottie', 'interactive_res']

// v1 沿用数字枚举，没有对应枚举值的类型不进入 v1
const V1_ASSET_TYPE: Partial<Record<QqEmojiAssetKind, QqSysEmojiAssetType>> = {
  png: QqSysEmojiAssetType.THUMB_PNG,
  apng: QqSysEmojiAssetType.APNG,
  lottie: QqSysEmojiAssetType.LOTTIE_JSON,
}

type LookupResult =
  | { status: 'ok'; definition: QqSysEmojiDefinition }
  | { status: 'notFound' }
  | { status: 'error'; message: string }

interface DefinitionsFile {
  requestId: string
  finishedAt: string
  results: Record<string, LookupResult>
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const sha1 = (data: Uint8Array) => createHash('sha1').update(data).digest('hex')
const isNumericId = (id: string) => /^\d+$/.test(id)

/**
 * 通过 NapCat 查询全部表情定义
 */
async function fetchDefinitions(knownIds: string[]): Promise<DefinitionsFile> {
  const request = {
    requestId: new Date().toISOString(),
    numericMax: Math.max(...knownIds.filter(isNumericId).map(Number)),
    extraIds: knownIds.filter((id) => !isNumericId(id)),
  }
  await mkdir(dirname(REQUEST_FILE), { recursive: true })
  await rm(DEFINITIONS_FILE, { force: true })
  await writeFile(REQUEST_FILE, JSON.stringify(request, null, 2))

  const compose = (...args: string[]) =>
    execFileSync('docker', ['compose', ...args], {
      cwd: NAPCAT_DIR,
      stdio: 'inherit',
    })

  // The plugin only runs at startup, so restart the existing container
  const stop = () => compose('stop', '-t', '60')
  stop()
  compose('up', '-d', '--no-recreate')
  console.log(
    `NapCat 已启动。若未能自动登录，请在 ${WEBUI_URL} 扫码登录（登录后插件自动开始查询）`
  )

  try {
    const deadline = Date.now() + DEFINITIONS_TIMEOUT_MS
    while (Date.now() < deadline) {
      await sleep(DEFINITIONS_POLL_MS)
      if (!existsSync(DEFINITIONS_FILE)) {
        continue
      }
      const definitions: DefinitionsFile = JSON.parse(
        await readFile(DEFINITIONS_FILE, 'utf-8')
      )
      if (definitions.requestId === request.requestId) {
        return definitions
      }
    }
    throw new Error(
      `等待 NapCat 查询结果超时（${DEFINITIONS_TIMEOUT_MS / 60_000} 分钟），` +
        `请检查 docker compose logs（在 docker/napcat 目录下）`
    )
  } finally {
    stop()
    await rm(REQUEST_FILE, { force: true })
  }
}

/**
 * 下载（或读取缓存的）资源包并解压，返回 文件键 → 内容
 */
async function loadVariantFiles(
  emojiId: string,
  urls: string[]
): Promise<Map<string, Uint8Array>> {
  const files = new Map<string, Uint8Array>()
  for (const url of urls) {
    const cacheFile = resolve(CDN_CACHE_DIR, decodeURIComponent(basename(url)))
    let zip: Uint8Array
    if (existsSync(cacheFile)) {
      zip = await readFile(cacheFile)
    } else {
      const response = await fetch(encodeURI(url))
      if (!response.ok) {
        throw new Error(`下载失败 ${response.status}: ${url}`)
      }
      zip = new Uint8Array(await response.arrayBuffer())
      await mkdir(CDN_CACHE_DIR, { recursive: true })
      await writeFile(cacheFile, zip)
    }

    for (const [name, data] of Object.entries(unzipSync(zip))) {
      const parts = name.split('/')
      if (name.endsWith('/') || parts.some((p) => JUNK_FILE_NAMES.has(p))) {
        continue
      }
      // Archives contain <emojiId>/<kind>/..., same layout as OUTPUT_DIR
      if (
        parts[0] !== emojiId ||
        !ASSET_KINDS.includes(parts[1] as QqEmojiAssetKind)
      ) {
        throw new Error(`资源包 ${url} 中有意外的路径: ${name}`)
      }
      files.set(name, data)
    }
  }
  return files
}

async function listEmojiFiles(emojiId: string): Promise<AssetHashMap> {
  const result: AssetHashMap = new Map()
  for (const kind of ASSET_KINDS) {
    const dirPath = resolve(OUTPUT_DIR, emojiId, kind)
    if (!existsSync(dirPath)) {
      continue
    }
    for (const file of await readdir(dirPath, {
      recursive: true,
      withFileTypes: true,
    })) {
      if (!file.isFile() || JUNK_FILE_NAMES.has(file.name)) {
        continue
      }
      const fullPath = resolve(file.parentPath, file.name)
      const key = relative(OUTPUT_DIR, fullPath).split(sep).join('/')
      result.set(key, sha1(await readFile(fullPath)))
    }
  }
  return result
}

/**
 * 把新资源同步到输出目录；有旧文件被替换时归档，返回是否发生归档
 * @param prevTimestamp 当前资源的发布时间戳，未知时为 undefined
 */
async function syncEmojiAssets(
  emojiId: string,
  files: Map<string, Uint8Array>,
  newTimestamp: number,
  prevTimestamp: number | undefined
): Promise<boolean> {
  const source: AssetHashMap = new Map(
    [...files].map(([key, data]) => [key, sha1(data)])
  )
  const plan = planEmojiSync(source, await listEmojiFiles(emojiId))

  if (plan.archive.length > 0) {
    if (prevTimestamp === newTimestamp) {
      throw new Error(
        `表情 ${emojiId} 的资源内容变了但时间戳 ${newTimestamp} 没变，请人工确认`
      )
    }
    const historyDir = resolve(
      OUTPUT_DIR,
      emojiId,
      HISTORY_DIR_NAME,
      historyDirName(prevTimestamp, newTimestamp)
    )
    for (const key of plan.archive) {
      const dest = resolve(historyDir, ...key.split('/').slice(1))
      if (existsSync(dest)) {
        throw new Error(`历史文件已存在，拒绝覆盖: ${dest}`)
      }
      await mkdir(dirname(dest), { recursive: true })
      await rename(resolve(OUTPUT_DIR, ...key.split('/')), dest)
    }
  }

  for (const key of plan.copy) {
    const dest = resolve(OUTPUT_DIR, ...key.split('/'))
    await mkdir(dirname(dest), { recursive: true })
    await writeFile(dest, files.get(key)!)
  }

  return plan.archive.length > 0
}

function toAssetPath(fullPath: string): string {
  return relative(resolve(ROOT, 'public'), fullPath).split(sep).join('/')
}

async function collectAssets(dirPath: string): Promise<QqEmojiAssetV2[]> {
  const assets: QqEmojiAssetV2[] = []
  for (const kind of ASSET_KINDS) {
    const kindDir = resolve(dirPath, kind)
    if (!existsSync(kindDir)) {
      continue
    }
    for (const file of await readdir(kindDir, {
      recursive: true,
      withFileTypes: true,
    })) {
      if (file.isFile() && !JUNK_FILE_NAMES.has(file.name)) {
        const fullPath = resolve(file.parentPath, file.name)
        assets.push({
          type: kind,
          name: relative(kindDir, fullPath).split(sep).join('/'),
          path: toAssetPath(fullPath),
        })
      }
    }
  }
  return assets.sort(
    (a, b) =>
      ASSET_KINDS.indexOf(a.type) - ASSET_KINDS.indexOf(b.type) ||
      a.name.localeCompare(b.name)
  )
}

async function collectHistory(
  emojiId: string
): Promise<QqSysEmojiHistoryV2[] | undefined> {
  const historyRoot = resolve(OUTPUT_DIR, emojiId, HISTORY_DIR_NAME)
  if (!existsSync(historyRoot)) {
    return undefined
  }
  const entries = []
  for (const dir of await readdir(historyRoot, { withFileTypes: true })) {
    if (!dir.isDirectory()) {
      continue
    }
    const info = parseHistoryDirName(dir.name)
    const assets = await collectAssets(resolve(historyRoot, dir.name))
    if (assets.length > 0) {
      entries.push({ info, assets })
    }
  }
  if (entries.length === 0) {
    return undefined
  }
  return entries
    .sort((a, b) => historySortKey(b.info) - historySortKey(a.info))
    .map(({ info, assets }) => ({
      ...(info.publishedAt !== undefined
        ? { publishedAt: toIsoTime(info.publishedAt) }
        : {}),
      ...(info.replacedAt !== undefined
        ? { replacedAt: toIsoTime(info.replacedAt) }
        : {}),
      assets,
    }))
}

/** 数字 id 在前按数值排序，其余按字符串排序 */
function compareEmojiIds(a: string, b: string): number {
  const na = Number(a)
  const nb = Number(b)
  if (isNaN(na) || isNaN(nb)) {
    return isNaN(na) && isNaN(nb) ? a.localeCompare(b) : isNaN(na) ? 1 : -1
  }
  return na - nb
}

/**
 * 由 v2 条目生成 v1 条目：v1 结构不变
 * isHide 与 startTime / endTime 沿用上一份 v1（QQ 接口返回的 isHide 恒为 true，时间为 "0"）
 */
function toV1Entry(
  emoji: QqSysEmojiV2,
  prevV1: QqSysEmojiWithAssets | undefined
): QqSysEmojiWithAssets {
  return {
    emojiId: emoji.emojiId,
    describe: emoji.describe,
    qzoneCode: emoji.qzoneCode,
    qcid: emoji.qcid,
    emojiType: emoji.emojiType,
    aniStickerPackId: emoji.aniStickerPackId,
    aniStickerId: emoji.aniStickerId,
    associateWords: emoji.associateWords.length
      ? emoji.associateWords
      : (prevV1?.associateWords ?? []),
    isHide: prevV1?.isHide ?? false,
    startTime: prevV1?.startTime ?? '',
    endTime: prevV1?.endTime ?? '',
    animationWidth: emoji.animationWidth,
    animationHeigh: emoji.animationHeigh,
    // v1 uses bare file names, ordered by enum type then name
    assets: emoji.assets
      .flatMap(({ type, name, path }) => {
        const v1Type = V1_ASSET_TYPE[type]
        return v1Type === undefined
          ? []
          : [{ type: v1Type, name: basename(name), path }]
      })
      .sort((a, b) =>
        a.type === b.type ? a.name.localeCompare(b.name) : a.type - b.type
      ),
  }
}

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let next = 0
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        await fn(items[next++])
      }
    })
  )
}

async function generate(reuse: boolean): Promise<void> {
  const prev: QqEmojiIndexV2 = JSON.parse(await readFile(INDEX_V2_FILE, 'utf-8'))
  const prevV1: QqSysEmojiWithAssets[] = JSON.parse(
    await readFile(INDEX_V1_FILE, 'utf-8')
  )
  const prevV1Map = new Map(prevV1.map((emoji) => [emoji.emojiId, emoji]))

  const definitions = reuse
    ? (JSON.parse(await readFile(DEFINITIONS_FILE, 'utf-8')) as DefinitionsFile)
    : await fetchDefinitions(Object.keys(prev.emojis))
  console.log(`使用 ${definitions.finishedAt} 的查询结果`)

  const emojis: Record<string, QqSysEmojiV2> = { ...prev.emojis }
  const report = {
    added: [] as string[],
    replaced: [] as string[],
    removed: [] as string[],
    errors: [] as string[],
  }

  const found = Object.entries(definitions.results).flatMap(([id, result]) =>
    result.status === 'ok' ? [{ id, def: result.definition }] : []
  )
  await mapWithConcurrency(found, DOWNLOAD_CONCURRENCY, async ({ id, def }) => {
    const baseUrl = def.downloadInfo?.baseResDownloadUrl ?? ''
    const timestamp = parseResourceTimestamp(baseUrl)
    if (timestamp === undefined) {
      report.errors.push(`${id}: 无法解析资源时间戳 ${baseUrl}`)
      return
    }
    const prevEmoji = emojis[id]
    if (!prevEmoji) {
      report.added.push(id)
    }
    const prevTimestamp = prevEmoji?.assetsPublishedAt
      ? fromIsoTime(prevEmoji.assetsPublishedAt)
      : undefined

    const urls = [baseUrl, def.downloadInfo?.advancedResDownloadUrl ?? ''].filter(
      Boolean
    )
    const files = await loadVariantFiles(id, urls)
    if (await syncEmojiAssets(id, files, timestamp, prevTimestamp)) {
      report.replaced.push(id)
    }
    // The server definition is kept verbatim; our fields are filled in below
    emojis[id] = { ...def, assets: [], assetsPublishedAt: toIsoTime(timestamp) }
  })

  for (const [id, result] of Object.entries(definitions.results)) {
    const emoji = emojis[id]
    if (result.status === 'notFound' && emoji && !emoji.removed) {
      // Only emojis we have assets for can be "removed"; others never existed
      if (existsSync(resolve(OUTPUT_DIR, id))) {
        emoji.removed = true
        report.removed.push(id)
      }
    } else if (result.status === 'error') {
      report.errors.push(`${id}: ${result.message}`)
    }
  }

  const sortedIds = Object.keys(emojis).sort(compareEmojiIds)
  const sortedEmojis: Record<string, QqSysEmojiV2> = {}
  for (const id of sortedIds) {
    const emoji = emojis[id]
    emoji.assets = await collectAssets(resolve(OUTPUT_DIR, id))
    const history = await collectHistory(id)
    delete emoji.history
    // history last, for readable diffs
    sortedEmojis[id] = history ? { ...emoji, history } : emoji
  }

  const indexV2: QqEmojiIndexV2 = {
    syncedAt: new Date().toISOString(),
    emojis: sortedEmojis,
  }
  await writeFile(INDEX_V2_FILE, JSON.stringify(indexV2, null, 2))

  // v1 keeps its original shape and only lists emojis still on the server
  const indexV1 = sortedIds
    .filter((id) => !sortedEmojis[id].removed)
    .map((id) => toV1Entry(sortedEmojis[id], prevV1Map.get(id)))
  await writeFile(INDEX_V1_FILE, JSON.stringify(indexV1, null, 2))

  const list = (ids: string[]) =>
    ids
      .sort(compareEmojiIds)
      .map((id) => `${id}${emojis[id]?.describe ?? ''}`)
      .join(', ')
  console.log('—'.repeat(40))
  console.log(`新增 ${report.added.length}: ${list(report.added)}`)
  console.log(
    `资源换版（已归档旧版）${report.replaced.length}: ${list(report.replaced)}`
  )
  console.log(`新下架 ${report.removed.length}: ${list(report.removed)}`)
  if (report.errors.length > 0) {
    console.warn(
      `⚠️ 查询或下载出错 ${report.errors.length}:\n${report.errors.join('\n')}`
    )
  }
  console.log(
    `建议 commit message: chore: sync qq emojis ${indexV2.syncedAt.slice(0, 10)}`
  )
  console.log('—'.repeat(40))
}

// Compare as URLs: a hand-built `file://${argv[1]}` never matches on Windows
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  generate(process.argv.includes('--reuse')).catch((error) => {
    console.error('❌ 生成失败:', error)
    process.exit(1)
  })
}
