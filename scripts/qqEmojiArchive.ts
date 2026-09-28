/**
 * QQ Emoji 归档相关的纯函数（不依赖文件系统，便于单测）
 *
 * 文件键统一为 `<emojiId>/<png|apng|lottie>/<相对路径>`，使用 `/` 分隔
 */

/** 文件键 → 内容哈希 */
export type AssetHashMap = Map<string, string>

export interface EmojiSyncPlan {
  /** 需要写入输出目录的文件键 */
  copy: string[]
  /** 需要先移入 _history 的输出目录文件键 */
  archive: string[]
}

export function getEmojiIdOfKey(key: string): string {
  return key.slice(0, key.indexOf('/'))
}

/**
 * 比较一个表情的新资源（source）与输出目录现有资源（target），得出同步动作
 * 同名文件内容变化或旧文件不再存在时，旧文件都要归档
 */
export function planEmojiSync(
  source: AssetHashMap,
  target: AssetHashMap
): EmojiSyncPlan {
  const copy: string[] = []
  const archive: string[] = []

  for (const [key, hash] of source) {
    const targetHash = target.get(key)
    if (targetHash === hash) {
      continue
    }
    if (targetHash !== undefined) {
      archive.push(key)
    }
    copy.push(key)
  }
  for (const key of target.keys()) {
    if (!source.has(key)) {
      archive.push(key)
    }
  }

  return { copy: copy.sort(), archive: archive.sort() }
}

/**
 * 从 CDN 资源地址中取出发布时间戳（秒），例如
 * https://wa.qq.com/qgif-web-permanent/sysemoji/v1/singleres/494_base_1789715609.zip → 1789715609
 */
export function parseResourceTimestamp(url: string): number | undefined {
  const match = url.match(/_(?:base|adv)_(\d+)\.zip$/)
  return match ? Number(match[1]) : undefined
}

/**
 * QQNT 资源体系上线时统一上传的时间戳（2024-04-11）；
 * 带此时间戳的资源实际发布时间只能确定「不晚于」这一天
 */
export const BASELINE_TIMESTAMP = 1712825561

/**
 * 被替换的旧资源的归档目录名：
 * 已知发布时间戳时用时间戳，否则用「被替换的时间戳」加 before- 前缀
 */
export function historyDirName(
  replacedTimestamp: number | undefined,
  newTimestamp: number
): string {
  return replacedTimestamp !== undefined
    ? String(replacedTimestamp)
    : `before-${newTimestamp}`
}

export interface HistoryDirInfo {
  publishedAt?: number
  replacedAt?: number
}

export function parseHistoryDirName(name: string): HistoryDirInfo {
  const before = name.match(/^before-(\d+)$/)
  if (before) {
    return { replacedAt: Number(before[1]) }
  }
  if (/^\d+$/.test(name)) {
    return { publishedAt: Number(name) }
  }
  throw new Error(`Unrecognized _history directory name: ${name}`)
}

/** 历史版本排序键：已知发布时间用发布时间，否则用被替换时间 */
export function historySortKey(info: HistoryDirInfo): number {
  return info.publishedAt ?? info.replacedAt ?? 0
}

export const toIsoTime = (timestamp: number) =>
  new Date(timestamp * 1000).toISOString()

export const fromIsoTime = (iso: string) =>
  Math.floor(new Date(iso).getTime() / 1000)
