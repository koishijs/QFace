// ── 公共表情包类型定义 ─────────────────────────────────────────────────────

/** 资源类型（QQ扩展） */
export enum AssetType {
  Static = 0, // 静态图（PNG）
  Animated = 2, // 动态图（APNG/GIF）
}

/** 单个资源文件描述 */
export interface Asset {
  type: AssetType
  name: string
  path: string // 相对路径或URL
}

/** 统一表情项（兼容QQ与B站） */
export interface UnifiedEmoji {
  /** 表情唯一标识（QQ为emojiId字符串，B站为id数字转字符串） */
  id: string
  /** 表情描述/标题 */
  description: string
  /** 输入触发器（关联词/短代码列表） */
  shortCodes: string[]
  /** 静态资源URL或本地路径 */
  staticUrl: string
  /** 动态资源URL或本地路径（若无则省略） */
  animatedUrl?: string
  /** 是否隐藏（仅QQ支持，B站默认false） */
  isHide: boolean
  /** 所属表情包ID（QQ统一归入'0'，B站用packageId） */
  packageId: string
  /** 动效贴纸包ID（QQ扩展） */
  aniStickerPackId?: number
  /** 动效贴纸ID（QQ扩展） */
  aniStickerId?: number
  /** 额外元数据（保留原始数据差异） */
  meta?: Record<string, unknown>
}

/** 统一表情包（分组） */
export interface UnifiedEmojiPackage {
  /** 表情包ID */
  id: string
  /** 表情包名称 */
  name: string
  /** 封面图URL */
  coverUrl?: string
  /** 包含的表情列表 */
  emojis: UnifiedEmoji[]
}

/** 表情包摘要（用于 _index.json，不含emojis） */
export interface UnifiedEmojiPackageMeta {
  id: string
  name: string
  coverUrl?: string
  count: number
}

// ── QQ原始数据接口 ──────────────────────────────────────────────────────────

export interface QQAsset {
  type: number
  name: string
  path: string
}

export interface QQEmojiRaw {
  emojiId: string
  describe: string
  qzoneCode?: string | number
  qcid?: number
  emojiType: number
  aniStickerPackId: number
  aniStickerId: number
  associateWords: string[]
  isHide: boolean
  startTime?: string
  endTime?: string
  animationWidth?: number
  animationHeigh?: number
  assets: QQAsset[]
}

// ── B站原始数据接口 ─────────────────────────────────────────────────────────

export interface BiliEmojiRaw {
  packageId: number
  packageName: string
  packageCover?: string
  id: number
  text: string
  url: string
  gifUrl?: string
  path?: string
  gifPath?: string
}

// ── 适配器：QQ → 统一格式 ────────────────────────────────────────────────────

export function qqEmojiToUnified(raw: QQEmojiRaw): UnifiedEmoji {
  const staticAsset = raw.assets.find((a) => a.type === AssetType.Static)
  const animatedAsset = raw.assets.find((a) => a.type === AssetType.Animated)
  const staticUrl = staticAsset?.path ?? ''
  const animatedUrl = animatedAsset?.path

  const shortCodes = [...(raw.associateWords ?? [])]
  if (raw.qzoneCode != null && String(raw.qzoneCode).trim() !== '') {
    shortCodes.unshift(String(raw.qzoneCode))
  }

  return {
    id: raw.emojiId,
    description: raw.describe || raw.emojiId,
    shortCodes,
    staticUrl,
    animatedUrl:
      animatedUrl && animatedUrl !== staticUrl ? animatedUrl : undefined,
    isHide: raw.isHide,
    packageId: '0',
    aniStickerPackId: raw.aniStickerPackId || undefined,
    aniStickerId: raw.aniStickerId || undefined,
    meta: {
      qzoneCode: raw.qzoneCode,
      emojiType: raw.emojiType,
      animationWidth: raw.animationWidth,
      animationHeigh: raw.animationHeigh,
    },
  }
}

// ── 适配器：B站 → 统一格式 ───────────────────────────────────────────────────

export function biliEmojiToUnified(raw: BiliEmojiRaw): UnifiedEmoji {
  let description = raw.text.replace(/^\[|\]$/g, '')
  if (!description) description = `${raw.packageName}_${raw.id}`

  const animatedUrl = raw.gifPath || raw.gifUrl

  return {
    id: String(raw.id),
    description,
    shortCodes: [raw.text],
    staticUrl: raw.path || raw.url,
    animatedUrl: animatedUrl && animatedUrl !== raw.url ? animatedUrl : undefined,
    isHide: false,
    packageId: String(raw.packageId),
    meta: {
      packageName: raw.packageName,
      packageCover: raw.packageCover,
      originalUrl: raw.url,
    },
  }
}

// ── 批量转换辅助函数 ──────────────────────────────────────────────────────────

/** 批量将QQ表情列表转换为统一表情数组 */
export function qqListToUnified(list: QQEmojiRaw[]): UnifiedEmoji[] {
  return list.map(qqEmojiToUnified)
}

/** 批量将B站表情列表按包分组，返回统一表情包数组 */
export function biliListToPackages(list: BiliEmojiRaw[]): UnifiedEmojiPackage[] {
  const packagesMap = new Map<string, UnifiedEmojiPackage>()

  for (const item of list) {
    const packageId = String(item.packageId)
    if (!packagesMap.has(packageId)) {
      packagesMap.set(packageId, {
        id: packageId,
        name: item.packageName,
        coverUrl: item.packageCover,
        emojis: [],
      })
    }
    packagesMap.get(packageId)!.emojis.push(biliEmojiToUnified(item))
  }

  return Array.from(packagesMap.values())
}
