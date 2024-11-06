import { readdir, readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'
import { XMLParser } from 'fast-xml-parser'
import {
  WechatNewEmojiConfig,
  WechatNewEmojiItem,
} from '../docs/types/WechatNewEmoji'

const ROOT_DIR = resolve(import.meta.dirname, '..')
const NEWEMOJI_CONFIG_XML = resolve(
  ROOT_DIR,
  'assets/wechat_emoji/newemoji/newemoji-config.xml'
)
const WECHAT_QQ_EMOJI_DIR = resolve(ROOT_DIR, 'assets/wechat_emoji/qqemoji')
const OUTPUT_INDEX_FILE = resolve(ROOT_DIR, 'assets/wechat_emoji/_index.json')

function calcRelativePath(path: string) {
  return path.replace(resolve(ROOT_DIR, 'assets'), 'assets').replace(/\\/g, '/')
}
function transformKeyToCamelCase(obj: any) {
  const newObj: any = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key]
      const newKey = key.replace(/[_-](\w)/g, (_, p1) => p1.toUpperCase())
      newObj[newKey] = value
    }
  }
  return newObj
}

const wechatEmojiMap = new Map<number, WechatNewEmojiItem>()

const xml = await readFile(NEWEMOJI_CONFIG_XML, 'utf-8')
const newEmojiConfig = new XMLParser().parse(xml) as WechatNewEmojiConfig
console.log(newEmojiConfig.newemoji.emoji.length)
newEmojiConfig.newemoji.emoji.forEach((emoji) => {
  emoji = transformKeyToCamelCase(emoji)
  emoji.path = `assets/wechat_emoji/newemoji/${emoji.fileName}`
  wechatEmojiMap.set(emoji.eggIndex, emoji)
})

const qqEmojiFiles = await readdir(WECHAT_QQ_EMOJI_DIR, {
  withFileTypes: true,
  recursive: false,
})
qqEmojiFiles.forEach(async (file) => {
  if (!file.isFile()) {
    return
  }

  const eggIndex = Number(file.name.split('.')[0])
  const key = `qqemoji:${eggIndex}`
  const path = calcRelativePath(resolve(file.parentPath, file.name))
  wechatEmojiMap.set(eggIndex, {
    key,
    cnValue: '',
    qqValue: key,
    enValue: '',
    twValue: '',
    thValue: '',
    fileName: file.name,
    eggIndex: eggIndex,
    path,
  } as WechatNewEmojiItem)
})

await writeFile(
  OUTPUT_INDEX_FILE,
  JSON.stringify(
    Array.from(wechatEmojiMap.values()).sort((a, b) => a.eggIndex - b.eggIndex),
    null,
    2
  )
)
