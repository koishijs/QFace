export interface BilibiliEmoteItem {
  id: number
  package_id: number
  text: string
  url: string
  gif_url?: string
  type: number
  attr: number
  meta: {
    size?: number
    suggest?: string[]
    alias?: string
  }
  mtime: number
}

export interface BilibiliEmotePackage {
  id: number
  text: string
  url: string
  mtime: number
  type: number
  attr: number
  meta: {
    item?: {
      jump_title?: string
    }
    size?: number
  }
  emote?: BilibiliEmoteItem[]
}

export interface BilibiliEmojiItem {
  packageId: number
  packageName: string
  packageCover: string
  id: number
  text: string
  url: string
  gifUrl?: string
  path?: string
  gifPath?: string
}
