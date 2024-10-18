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
