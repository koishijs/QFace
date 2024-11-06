export interface WechatNewEmojiItem {
  key: string
  cnValue: string
  qqValue: string
  enValue: string
  twValue: string
  thValue: string
  fileName: string
  eggIndex: number
  path?: string
}

export interface WechatNewEmojiConfig {
  newemoji: {
    emoji: WechatNewEmojiItem[]
  }
}
