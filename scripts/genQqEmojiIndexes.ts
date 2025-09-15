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
 * QQ Emoji 资源生成器
 *
 * 此脚本自动从 QQ 的软件文件夹中读取 Emoji 相关的资源文件
 * 拷贝资源到 public/assets/qq_emoji 文件夹中
 * 并生成一个索引文件
 * 目前只支持 macOS 系统
 */

// 配置常量
const CONFIG = {
  PLATFORM: 'darwin' as const,
  QQNT_APP_SUPPORT_PATH:
    'Library/Containers/com.tencent.qq/Data/Library/Application Support/QQ',
  FACE_CONFIG_RELATIVE_PATH:
    'global/nt_data/Emoji/emoji-resource/face_config.json',
  EMOJI_RESOURCE_RELATIVE_PATH:
    'nt_data/Emoji/BaseEmojiSyastems/EmojiSystermResource',
  OUTPUT_RELATIVE_PATH: 'public/assets/qq_emoji',
  BACKUP_RELATIVE_PATH: '.backup',
  INDEX_FILE_NAME: '_index.json',
  FACE_CONFIG_FILE_NAME: 'face_config.json',
} as const

// 资源类型配置
const ASSET_TYPE_CONFIG = {
  png: QqSysEmojiAssetType.THUMB_PNG,
  apng: QqSysEmojiAssetType.APNG,
  lottie: QqSysEmojiAssetType.LOTTIE_JSON,
} as const

/**
 * 路径管理器
 */
class PathManager {
  private readonly projectRoot: string
  private readonly qqntAppSupportDir: string
  private readonly faceConfigFile: string
  private readonly outputDir: string
  private readonly backupDir: string
  private readonly outputConfigFile: string

  constructor() {
    this.projectRoot = resolve(import.meta.dirname, '..')
    this.qqntAppSupportDir = resolve(homedir(), CONFIG.QQNT_APP_SUPPORT_PATH)
    this.faceConfigFile = resolve(
      this.qqntAppSupportDir,
      CONFIG.FACE_CONFIG_RELATIVE_PATH
    )
    this.outputDir = resolve(this.projectRoot, CONFIG.OUTPUT_RELATIVE_PATH)
    this.backupDir = resolve(this.projectRoot, CONFIG.BACKUP_RELATIVE_PATH)
    this.outputConfigFile = resolve(this.outputDir, CONFIG.INDEX_FILE_NAME)
  }

  getProjectRoot(): string {
    return this.projectRoot
  }

  getQqntAppSupportDir(): string {
    return this.qqntAppSupportDir
  }

  getFaceConfigFile(): string {
    return this.faceConfigFile
  }

  getOutputDir(): string {
    return this.outputDir
  }

  getBackupDir(): string {
    return this.backupDir
  }

  getOutputConfigFile(): string {
    return this.outputConfigFile
  }

  /**
   * 获取相对路径（从 assets 文件夹开始）
   * 例如: C:\path\to\assets\qq_emoji\resfile\emoji\123456.png -> assets/resfile/emoji/123456.png
   */
  getRelativePath(path: string): string {
    return path
      .replace(resolve(this.projectRoot, 'public/assets'), 'assets')
      .replace(/\\/g, '/')
  }

  /**
   * 查找最新的 QQNT Emoji 资源目录
   */
  async findLatestQqntEmojiAssetsDir(): Promise<string> {
    const dirs = await readdir(this.qqntAppSupportDir, {
      withFileTypes: true,
      recursive: false,
    })

    const qqntDirs = dirs.filter(
      (dir) => dir.isDirectory() && dir.name.startsWith('nt_qq_')
    )

    if (qqntDirs.length === 0) {
      throw new Error('No nt_qq_* directory found')
    }

    const dirStats = await Promise.all(
      qqntDirs.map(async (dir) => ({
        stat: await stat(resolve(this.qqntAppSupportDir, dir.name)),
        dir,
      }))
    )

    const latestDir = dirStats.sort(
      (a, b) => Number(b.stat.mtimeMs) - Number(a.stat.mtimeMs)
    )[0]

    return resolve(
      this.qqntAppSupportDir,
      latestDir.dir.name,
      CONFIG.EMOJI_RESOURCE_RELATIVE_PATH
    )
  }
}

/**
 * Emoji 管理器
 */
class EmojiManager {
  private readonly emojiMap = new Map<string, QqSysEmojiWithAssets>()

  /**
   * 创建默认的 Emoji 对象
   */
  private createDefaultEmoji(
    emojiId: string,
    partial?: Partial<QqSysEmojiItem>
  ): QqSysEmojiWithAssets {
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

    return { ...defaultEmoji, ...partial }
  }

  /**
   * 从 NT 系统 Emoji 项目创建 Emoji 对象
   */
  private createEmojiFromNTItem(
    item: QqNTSystemEmojiItem
  ): QqSysEmojiWithAssets {
    return this.createDefaultEmoji(item.QSid, {
      describe: item.QDes,
      qzoneCode: item.EMCode,
      qcid: item.QCid ? Number(item.QCid) : 0,
      emojiType: item.AniStickerType ? Number(item.AniStickerType) : 0,
      aniStickerPackId: item.AniStickerPackId
        ? Number(item.AniStickerPackId)
        : 0,
      aniStickerId: item.AniStickerId ? Number(item.AniStickerId) : 0,
      associateWords: [],
      isHide: item.QHide === '1',
      startTime: '',
      endTime: '',
      animationWidth: item.AniStickerWidth ? Number(item.AniStickerWidth) : 0,
      animationHeigh: item.AniStickerHeight ? Number(item.AniStickerHeight) : 0,
    })
  }

  /**
   * 获取或创建 Emoji 对象
   */
  getOrCreateEmoji(emojiId: string): QqSysEmojiWithAssets {
    if (this.emojiMap.has(emojiId)) {
      return this.emojiMap.get(emojiId)!
    }

    const emoji = this.createDefaultEmoji(emojiId)
    emoji.assets = []
    this.emojiMap.set(emojiId, emoji)
    return emoji
  }

  /**
   * 从配置文件加载 Emoji 数据
   */
  async loadFromConfig(faceConfigFile: string): Promise<void> {
    const config: {
      sysface: QqNTSystemEmojiItem[]
      emoji: QqNTSystemEmojiItem[]
    } = JSON.parse(await readFile(faceConfigFile, 'utf-8'))

    // 加载系统表情
    for (const item of config.sysface) {
      this.emojiMap.set(item.QSid, this.createEmojiFromNTItem(item))
    }

    // 加载普通表情
    for (const item of config.emoji) {
      this.emojiMap.set(item.QSid, this.createEmojiFromNTItem(item))
    }
  }

  /**
   * 获取排序后的 Emoji 列表
   */
  getSortedEmojiList(): QqSysEmojiWithAssets[] {
    return (
      Array.from(this.emojiMap.values())
        // 排序 emojiId
        // 非数字id的排在后面，但如果两个都是非数字id，就按 utf-8 字符串排序
        .sort((a, b) => {
          const aId = Number(a.emojiId)
          const bId = Number(b.emojiId)

          if (isNaN(aId) && isNaN(bId)) {
            return a.emojiId.localeCompare(b.emojiId)
          }
          if (isNaN(aId) || isNaN(bId)) {
            return isNaN(aId) ? 1 : -1
          }
          return aId - bId
        })
        // 排序资源文件，优先级：png > apng > lottie
        .map((emoji) => {
          emoji.assets.sort((a, b) => {
            if (a.type === b.type) {
              return a.name.localeCompare(b.name)
            }
            return a.type - b.type
          })
          return emoji
        })
    )
  }
}

/**
 * 文件操作管理器
 */
class FileManager {
  constructor(private readonly pathManager: PathManager) {}

  /**
   * 检查文件或目录是否存在
   */
  async exists(path: string): Promise<boolean> {
    try {
      await stat(path)
      return true
    } catch {
      return false
    }
  }

  /**
   * 备份现有文件
   */
  async backupExistingFiles(): Promise<void> {
    try {
      await mkdir(this.pathManager.getBackupDir(), { recursive: true })

      if (await this.exists(this.pathManager.getOutputDir())) {
        const timestamp = new Date().toISOString().replace(/:/g, '-')
        const backupPath = resolve(
          this.pathManager.getBackupDir(),
          `qq_emoji_${timestamp}`
        )
        await rename(this.pathManager.getOutputDir(), backupPath)
        console.log(`已备份现有文件到: ${backupPath}`)
      }
    } catch (error) {
      console.warn('备份文件时出现警告:', error)
    }
  }

  /**
   * 复制资源文件
   */
  async copyResourceFiles(qqntEmojiAssetsDir: string): Promise<void> {
    try {
      await mkdir(this.pathManager.getOutputDir(), { recursive: true })

      // 复制 Emoji 资源目录
      await cp(qqntEmojiAssetsDir, this.pathManager.getOutputDir(), {
        recursive: true,
      })

      // 复制配置文件
      await cp(
        this.pathManager.getFaceConfigFile(),
        resolve(this.pathManager.getOutputDir(), CONFIG.FACE_CONFIG_FILE_NAME)
      )

      console.log('资源文件复制完成')
    } catch (error) {
      console.error('复制资源文件时出错:', error)
      throw error
    }
  }

  /**
   * 处理指定目录下的资源文件
   */
  async processAssetDirectory(
    dirPath: string,
    assetType: QqSysEmojiAssetType,
    emoji: QqSysEmojiWithAssets
  ): Promise<void> {
    if (!(await this.exists(dirPath))) {
      return
    }

    const files = await readdir(dirPath, {
      recursive: true,
      withFileTypes: true,
    })

    await Promise.all(
      files
        .filter((file) => file.isFile())
        .map(async (file) => {
          const path = this.pathManager.getRelativePath(
            resolve(file.parentPath, file.name)
          )
          emoji.assets.push({
            type: assetType,
            name: file.name,
            path,
          })
        })
    )
  }

  /**
   * 处理所有 Emoji 资源
   */
  async processAllEmojiAssets(emojiManager: EmojiManager): Promise<void> {
    const assetsDirIterator = await opendir(this.pathManager.getOutputDir(), {
      recursive: false,
    })

    for await (const file of assetsDirIterator) {
      if (!file.isDirectory()) {
        continue
      }

      const emojiId = file.name
      console.log(`正在处理表情 ${emojiId}`)

      const emoji = emojiManager.getOrCreateEmoji(emojiId)

      // 处理所有类型的资源目录
      await Promise.all(
        Object.entries(ASSET_TYPE_CONFIG).map(([dirName, assetType]) =>
          this.processAssetDirectory(
            resolve(file.parentPath, file.name, dirName),
            assetType,
            emoji
          )
        )
      )
    }
  }

  /**
   * 生成索引文件
   */
  async generateIndexFile(emojiManager: EmojiManager): Promise<void> {
    const emojiList = emojiManager.getSortedEmojiList()
    await writeFile(
      this.pathManager.getOutputConfigFile(),
      JSON.stringify(emojiList, null, 2)
    )
    console.log(`索引文件已生成: ${this.pathManager.getOutputConfigFile()}`)
  }
}

/**
 * QQ Emoji 资源生成器主类
 */
class QqEmojiGenerator {
  private readonly pathManager: PathManager
  private readonly fileManager: FileManager
  private readonly emojiManager: EmojiManager

  constructor() {
    this.pathManager = new PathManager()
    this.fileManager = new FileManager(this.pathManager)
    this.emojiManager = new EmojiManager()
  }

  /**
   * 检查系统兼容性
   */
  private checkPlatformCompatibility(): void {
    if (process.platform !== CONFIG.PLATFORM) {
      throw new Error('此脚本仅支持 macOS 系统')
    }
  }

  /**
   * 执行完整的生成流程
   */
  async generate(): Promise<void> {
    try {
      console.log('开始生成 QQ Emoji 资源...')

      // 检查系统兼容性
      this.checkPlatformCompatibility()

      // 查找 QQNT Emoji 资源目录
      console.log('正在查找 QQNT Emoji 资源目录...')
      const qqntEmojiAssetsDir =
        await this.pathManager.findLatestQqntEmojiAssetsDir()
      console.log(`找到资源目录: ${qqntEmojiAssetsDir}`)

      // 备份现有文件
      console.log('正在备份现有文件...')
      await this.fileManager.backupExistingFiles()

      // 复制资源文件
      console.log('正在复制资源文件...')
      await this.fileManager.copyResourceFiles(qqntEmojiAssetsDir)

      // 加载配置文件
      console.log('正在加载配置文件...')
      await this.emojiManager.loadFromConfig(
        this.pathManager.getFaceConfigFile()
      )

      // 处理所有 Emoji 资源
      console.log('正在处理 Emoji 资源...')
      await this.fileManager.processAllEmojiAssets(this.emojiManager)

      // 生成索引文件
      console.log('正在生成索引文件...')
      await this.fileManager.generateIndexFile(this.emojiManager)

      console.log('✅ QQ Emoji 资源生成完成！')
    } catch (error) {
      console.error('❌ 生成过程中出现错误:', error)
      throw error
    }
  }
}

// 主执行函数
async function main(): Promise<void> {
  const generator = new QqEmojiGenerator()
  await generator.generate()
}

// 执行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('脚本执行失败:', error)
    process.exit(1)
  })
}
