import {
  cp,
  mkdir,
  opendir,
  readdir,
  readFile,
  rename,
  stat,
  writeFile,
} from 'fs/promises'
import { resolve } from 'path'
import {
  QqSysEmojiItem,
  QqSysEmojiWithAssets,
  QqSysEmojiAssetType,
  QqNTSystemEmojiItem,
} from '../docs/types/QqSysEmoji'
import { homedir } from 'os'

/**
 * 此脚本自动从 QQ 的软件文件夹中读取 Emoji 相关的资源文件
 * 拷贝资源到 public/assets/qq_emoji 文件夹中
 * 并生成一个索引文件
 * 目前只支持 macOS 系统
 */

// 此脚本目前只兼容 macOS 系统
if (process.platform !== 'darwin') {
  throw new Error('This script only supports macOS')
}

const PROJECT_ROOT = resolve(import.meta.dirname, '..')
const QQNT_APPLICATION_SUPPORT_DIR = resolve(
  homedir(),
  'Library/Containers/com.tencent.qq/Data/Library/Application Support/QQ'
)
const FACE_CONFIG_FILE = resolve(
  QQNT_APPLICATION_SUPPORT_DIR,
  'global/nt_data/Emoji/emoji-resource/face_config.json'
)
// 寻找 Emoji 资源文件夹
const QQNT_EMOJI_ASSETS_DIR = await (async () => {
  // 首先找到更新时间最近的 nt_qq_* 文件夹
  const dirs = await readdir(QQNT_APPLICATION_SUPPORT_DIR, {
    withFileTypes: true,
    recursive: false,
  })
  const qqntDirs = dirs.filter(
    (dir) => dir.isDirectory() && dir.name.startsWith('nt_qq_')
  )
  const dirStats = await Promise.all(
    qqntDirs.map(async (dir) => ({
      stat: await stat(resolve(QQNT_APPLICATION_SUPPORT_DIR, dir.name)),
      dir,
    }))
  )
  const latestDir = dirStats.sort(
    (a, b) => Number(b.stat.mtimeMs) - Number(a.stat.mtimeMs)
  )[0]
  if (!latestDir) {
    throw new Error('No nt_qq_* directory found')
  }
  return resolve(
    QQNT_APPLICATION_SUPPORT_DIR,
    latestDir.dir.name,
    'nt_data/Emoji/BaseEmojiSyastems/EmojiSystermResource'
  )
})()
const OUTPUT_DIR = resolve(PROJECT_ROOT, 'public/assets/qq_emoji')
const OUTPUT_CONFIG_FILE = resolve(OUTPUT_DIR, '_index.json')
const BACKUP_DIR = resolve(PROJECT_ROOT, '.backup')

// 首先备份旧的文件
try {
  await mkdir(BACKUP_DIR, { recursive: true })
  const exist = await stat(BACKUP_DIR).then((stat) => stat.isDirectory())
  if (exist) {
    await rename(
      OUTPUT_DIR,
      resolve(
        BACKUP_DIR,
        `qq_emoji_${new Date().toISOString().replace(/:/g, '-')}`
      )
    )
  }
} catch (_) {}

// 复制文件
try {
  await mkdir(OUTPUT_DIR, { recursive: true })
} catch (error) {
  console.error(error)
}
await cp(QQNT_EMOJI_ASSETS_DIR, OUTPUT_DIR, {
  recursive: true,
})
await cp(FACE_CONFIG_FILE, resolve(OUTPUT_DIR, 'face_config.json'))

const emojiMap = new Map<string, QqSysEmojiWithAssets>()
const config: {
  sysface: QqNTSystemEmojiItem[]
  emoji: QqNTSystemEmojiItem[]
} = JSON.parse(await readFile(FACE_CONFIG_FILE, 'utf-8'))
for (const item of config.sysface) {
  emojiMap.set(item.QSid, defineEmoji(item.QSid, defineEmojiByNTItem(item)))
}
for (const item of config.emoji) {
  emojiMap.set(item.QSid, defineEmoji(item.QSid, defineEmojiByNTItem(item)))
}

/**
 * get relative path from assets folder
 * e.g. C:\path\to\assets\qq_emoji\resfile\emoji\123456.png -> assets/resfile/emoji/123456.png
 */
function calcRelativePath(path: string) {
  return path
    .replace(resolve(PROJECT_ROOT, 'public/assets'), 'assets')
    .replace(/\\/g, '/')
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
function defineEmojiByNTItem(item: QqNTSystemEmojiItem) {
  const emoji = defineEmoji(item.QSid, {
    describe: item.QDes,
    qzoneCode: item.EMCode,
    qcid: item.QCid ? Number(item.QCid) : 0,
    emojiType: item.AniStickerType ? Number(item.AniStickerType) : 0,
    aniStickerPackId: item.AniStickerPackId ? Number(item.AniStickerPackId) : 0,
    aniStickerId: item.AniStickerId ? Number(item.AniStickerId) : 0,
    associateWords: [],
    isHide: item.QHide === '1',
    startTime: '',
    endTime: '',
    animationWidth: item.AniStickerWidth ? Number(item.AniStickerWidth) : 0,
    animationHeigh: item.AniStickerHeight ? Number(item.AniStickerHeight) : 0,
  })
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
async function exist(path: string) {
  try {
    await stat(path)
    return true
  } catch (error) {
    return false
  }
}

const assetsDirIterator = await opendir(OUTPUT_DIR, {
  recursive: false,
})
for await (const file of assetsDirIterator) {
  if (!file.isDirectory()) {
    continue
  }
  const emojiId = file.name
  console.info(`Processing emoji ${emojiId}`)
  const emoji = getEmojiById(emojiId)

  const pngDir = resolve(file.parentPath, file.name, 'png')
  const apngDir = resolve(file.parentPath, file.name, 'apng')
  const lottieDir = resolve(file.parentPath, file.name, 'lottie')

  if (await exist(pngDir)) {
    const pngFiles = await readdir(pngDir, {
      recursive: true,
      withFileTypes: true,
    })
    await Promise.all(
      pngFiles
        .filter((file) => file.isFile())
        .map(async (file) => {
          const path = calcRelativePath(resolve(file.parentPath, file.name))
          emoji.assets.push({
            type: QqSysEmojiAssetType.THUMB_PNG,
            name: file.name,
            path,
          })
        })
    )
  }

  if (await exist(apngDir)) {
    const apngFiles = await readdir(apngDir, {
      recursive: true,
      withFileTypes: true,
    })
    await Promise.all(
      apngFiles
        .filter((file) => file.isFile())
        .map(async (file) => {
          const path = calcRelativePath(resolve(file.parentPath, file.name))
          emoji.assets.push({
            type: QqSysEmojiAssetType.APNG,
            name: file.name,
            path,
          })
        })
    )
  }

  if (await exist(lottieDir)) {
    const lottieFiles = await readdir(lottieDir, {
      recursive: true,
      withFileTypes: true,
    })
    await Promise.all(
      lottieFiles
        .filter((file) => file.isFile())
        .map(async (file) => {
          const path = calcRelativePath(resolve(file.parentPath, file.name))
          emoji.assets.push({
            type: QqSysEmojiAssetType.LOTTIE_JSON,
            name: file.name,
            path,
          })
        })
    )
  }

  emojiMap.set(emojiId, emoji)
}

const emojiList = Array.from(emojiMap.values()).sort((a, b) => {
  const aId = Number(a.emojiId)
  const bId = Number(b.emojiId)
  // 非数字id的排在后面，但如果两个都是非数字id，就按 utf-8 字符串排序
  if (isNaN(aId) && isNaN(bId)) {
    return a.emojiId.localeCompare(b.emojiId)
  }
  if (isNaN(aId) || isNaN(bId)) {
    return isNaN(aId) ? 1 : -1
  }
  return aId - bId
})
await writeFile(OUTPUT_CONFIG_FILE, JSON.stringify(emojiList, null, 2))
