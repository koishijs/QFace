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

export interface QqSysEmojiGroup {
  groupName: string
  SysEmojiList: QqSysEmojiItem[]
}

export interface QQSysEmojiConfig {
  normalPanelResult: {
    SysEmojiGroupList: QqSysEmojiGroup[]
  }
  redHeartPanelResult: {
    SysEmojiGroupList: QqSysEmojiGroup[]
  }
  [key: string]: {
    SysEmojiGroupList: QqSysEmojiGroup[]
  }
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

/**
 * Version fields come from this repo's manual sync history, not from Tencent:
 * firstSeenIn is an upper bound of when the emoji shipped,
 * lastSeenIn is a lower bound of when it was removed.
 */
export interface QqSysEmojiHistory {
  firstSeenIn?: string
  lastSeenIn: string
  assets: QqSysEmojiAsset[]
}

export interface QqSysEmojiV2 extends QqSysEmojiWithAssets {
  firstSeenIn?: string
  lastSeenIn?: string
  /** First sync of the current assets; set only when history exists */
  assetsFirstSeenIn?: string
  removed?: true
  history?: QqSysEmojiHistory[]
}

export interface QqEmojiIndexV2 {
  qqntVersion: string
  emojis: QqSysEmojiV2[]
}

export interface QqNTSystemEmojiItem {
  QSid: string
  QCid?: `${number}`
  QDes: string
  IQLid: `${number}`
  AQLid: `${number}`
  EMCode: `${number}`
  AniStickerType?: number
  AniStickerPackId?: string
  AniStickerId?: string
  AniStickerWidth?: number
  AniStickerHeight?: number
  QHide?: '1'
}
