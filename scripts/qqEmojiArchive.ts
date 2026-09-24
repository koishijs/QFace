/**
 * QQ Emoji 归档相关的纯函数（不依赖文件系统，便于单测）
 *
 * 文件键统一为 `<emojiId>/<png|apng|lottie>/<相对路径>`，使用 `/` 分隔
 */

/** 文件键 → 内容哈希 */
export type AssetHashMap = Map<string, string>

export interface EmojiSyncPlan {
  /** 需要从 QQ 资源目录复制到输出目录的文件键 */
  copy: string[]
  /** 需要先移入 _history 的输出目录文件键 */
  archive: string[]
}

export interface EmojiVersionFields {
  firstSeenIn?: string
  lastSeenIn?: string
  removed?: true
}

export function getEmojiIdOfKey(key: string): string {
  return key.slice(0, key.indexOf('/'))
}

/** 至少含一个资源文件的表情 id */
export function collectEmojiIds(files: AssetHashMap): Set<string> {
  return new Set(Array.from(files.keys(), getEmojiIdOfKey))
}

/**
 * 比较 QQ 资源目录（source）与输出目录（target），得出同步动作
 * 整个表情在 source 中消失时不产生任何动作：保留原样，视为已下架
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

  const sourceEmojiIds = collectEmojiIds(source)
  for (const key of target.keys()) {
    if (sourceEmojiIds.has(getEmojiIdOfKey(key)) && !source.has(key)) {
      archive.push(key)
    }
  }

  return { copy: copy.sort(), archive: archive.sort() }
}

/**
 * 计算单个表情的版本字段
 * @param inSource 本次 QQ 资源目录中存在该表情的资源
 * @param inTarget 同步后输出目录中存在该表情的当前资源
 * @param prev 上一份 v2 索引中的同 id 条目
 */
export function computeVersionFields(
  inSource: boolean,
  inTarget: boolean,
  prev: EmojiVersionFields | undefined,
  curVersion: string
): EmojiVersionFields {
  if (inSource) {
    // prev 有 lastSeenIn 说明之前同步到过：沿用 firstSeenIn（基线表情保持缺省）
    const firstSeenIn = prev?.lastSeenIn ? prev.firstSeenIn : curVersion
    return {
      ...(firstSeenIn ? { firstSeenIn } : {}),
      lastSeenIn: curVersion,
    }
  }
  if (inTarget) {
    return {
      ...(prev?.firstSeenIn ? { firstSeenIn: prev.firstSeenIn } : {}),
      ...(prev?.lastSeenIn ? { lastSeenIn: prev.lastSeenIn } : {}),
      removed: true,
    }
  }
  return {}
}

/** 按 `.` / `-` 切分后逐段数值比较，例如 6.9.87-44204 < 7.0.2-53644 */
export function compareQqVersions(a: string, b: string): number {
  const pa = a.split(/[.-]/).map(Number)
  const pb = b.split(/[.-]/).map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) {
      return diff
    }
  }
  return 0
}
