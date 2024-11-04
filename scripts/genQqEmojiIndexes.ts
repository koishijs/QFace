import { readdir, readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'
import {
  QQSysEmojiConfig,
  QqSysEmojiItem,
  QqSysEmojiWithAssets,
  QqSysEmojiAssetType,
} from '../docs/types/QqSysEmoji'

const ROOT_DIR = resolve(import.meta.dirname, '..')
const DEFAULT_CONFIG_FILE = resolve(
  ROOT_DIR,
  'assets/qq_emoji/default_config.json'
)
const OUTPUT_CONFIG_FILE = resolve(
  ROOT_DIR,
  'assets/qq_emoji/generated_index.json'
)

const config: QQSysEmojiConfig = JSON.parse(
  await readFile(DEFAULT_CONFIG_FILE, 'utf-8')
)
const emojiMap = new Map<string, QqSysEmojiWithAssets>()
for (const list of config.normalPanelResult.SysEmojiGroupList) {
  for (const item of list.SysEmojiList) {
    emojiMap.set(item.emojiId, defineEmoji(item.emojiId, item))
  }
}

/**
 * get relative path from assets folder
 * e.g. C:\path\to\assets\qq_emoji\resfile\emoji\123456.png -> assets/resfile/emoji/123456.png
 */
function calcRelativePath(path: string) {
  return path.replace(resolve(ROOT_DIR, 'assets'), 'assets').replace(/\\/g, '/')
}

function defineEmoji(emojiId: string, partial?: Partial<QqSysEmojiItem>) {
  const defaultEmoji = {
    emojiId,
    describe: '',
    qzoneCode: '',
    qcid: 0,
    emojiType: 0,
    aniStickerPackId: 0,
    aniStickerId: 0,
    associateWords: [],
    isHide: false,
    startTime: '',
    endTime: '',
    animationWidth: 0,
    animationHeigh: 0,
    assets: [],
  } as QqSysEmojiWithAssets
  const emoji = { ...defaultEmoji, ...partial }
  return emoji
}
function getEmojiById(emojiId: string) {
  let emoji: QqSysEmojiWithAssets
  if (emojiMap.has(emojiId)) {
    emoji = emojiMap.get(emojiId)!
  } else {
    emoji = defineEmoji(emojiId)
    emojiMap.set(emojiId, emoji)
  }
  emoji.assets ||= []
  return emoji
}

const resEmojiFiles = await readdir(
  resolve(ROOT_DIR, 'assets/qq_emoji/resfile/emoji'),
  {
    recursive: true,
    withFileTypes: true,
  }
)
resEmojiFiles.forEach((file) => {
  if (!file.isFile()) return

  const relativePath = calcRelativePath(resolve(file.parentPath, file.name))
  const emojiId = relativePath.split('/')[4]!

  if (file.name.endsWith('.png')) {
    const emoji = getEmojiById(emojiId)
    emoji.assets.push({
      type: QqSysEmojiAssetType.APNG,
      name: file.name,
      path: relativePath,
    })
  } else if (file.name.endsWith('.json')) {
    const emoji = getEmojiById(emojiId)
    emoji.assets.push({
      type: QqSysEmojiAssetType.LOTTIE_JSON,
      name: file.name,
      path: relativePath,
    })
  }
})

const thumbFiles = await readdir(resolve(ROOT_DIR, 'assets/qq_emoji/thumbs'), {
  withFileTypes: true,
})
thumbFiles.forEach((file) => {
  if (!file.isFile()) return

  const relativePath = calcRelativePath(resolve(file.parentPath, file.name))

  if (file.name.endsWith('.png')) {
    const emojiId = file.name.slice(0, -4)
    const emoji = getEmojiById(emojiId)
    emoji.assets.push({
      type: QqSysEmojiAssetType.THUMB_PNG,
      name: file.name,
      path: relativePath,
    })
  } else if (file.name.endsWith('.gif')) {
    const emojiId = file.name.slice(0, -4).replace('gif_', '')
    const emoji = getEmojiById(emojiId)
    emoji.assets.push({
      type: QqSysEmojiAssetType.THUMB_GIF,
      name: file.name,
      path: relativePath,
    })
  }
})

const emojiList = Array.from(emojiMap.values())
emojiList.sort((a, b) => Number(a.emojiId) - Number(b.emojiId))

writeFile(OUTPUT_CONFIG_FILE, JSON.stringify(emojiList, null, 2))
