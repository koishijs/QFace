export interface QqSysEmojiItem {
  emojiId: string
  describe: string
  qzoneCode: string
  qcid: number
  emojiType: number // TODO: this should be enum, what are the possible values?
  aniStickerPackId: number
  aniStickerId: number
  associateWords: string[]
  isHide: boolean
  startTime: string
  endTime: string
  animationWidth: number
  animationHeigh: number
}

export interface QqSysEmojiAsset {
  type: QqSysEmojiAssetType
  name: string
  path: string
}

export enum QqSysEmojiAssetType {
  THUMB_PNG,
  THUMB_GIF,
  APNG,
  LOTTIE_JSON,
}

export interface QqSysEmojiWithAssets extends QqSysEmojiItem {
  assets: QqSysEmojiAsset[]
}

/** Emoji definition exactly as returned by QQNT BaseEmojiService.downloadBaseEmojiById */
export interface QqSysEmojiDefinition {
  emojiId: string
  describe: string
  qzoneCode: string
  qcid: number
  emojiType: number
  aniStickerPackId: number
  aniStickerId: number
  downloadInfo?: {
    baseResDownloadUrl: string
    advancedResDownloadUrl: string
  }
  associateWords: string[]
  isHide: boolean
  startTime: string
  endTime: string
  animationWidth: number
  animationHeigh: number
  needRefreshPanel?: boolean
}

/** Directory names inside the CDN resource archives */
export type QqEmojiAssetKind = 'png' | 'apng' | 'lottie' | 'interactive_res'

export interface QqEmojiAssetV2 {
  type: QqEmojiAssetKind
  name: string
  path: string
}

/**
 * Times are ISO strings taken from the timestamp in the CDN resource url
 * (e.g. 494_base_1789715609.zip), i.e. when that variant of the assets was published.
 * 2024-04-11 (1712825561) is the QQNT baseline upload: those assets were published on or before it.
 */
export interface QqSysEmojiHistoryV2 {
  /** Publish time of this variant, when known */
  publishedAt?: string
  /** Otherwise, when this variant was replaced by the next one */
  replacedAt?: string
  assets: QqEmojiAssetV2[]
}

export interface QqSysEmojiV2 extends QqSysEmojiDefinition {
  assets: QqEmojiAssetV2[]
  /** Publish time of the current assets */
  assetsPublishedAt?: string
  /** The id no longer resolves on the server */
  removed?: true
  history?: QqSysEmojiHistoryV2[]
}

export interface QqEmojiIndexV2 {
  syncedAt: string
  /** Keyed by emojiId */
  emojis: Record<string, QqSysEmojiV2>
}
