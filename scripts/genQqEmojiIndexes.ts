import { createHash } from 'crypto'
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rename,
  stat,
  writeFile,
} from 'fs/promises'
import { dirname, relative, resolve, sep } from 'path'
import {
  QqSysEmojiItem,
  QqSysEmojiWithAssets,
  QqSysEmojiAsset,
  QqSysEmojiAssetType,
  QqNTSystemEmojiItem,
  QQSysEmojiConfig,
  QqSysEmojiGroup,
  QqSysEmojiV2,
  QqEmojiIndexV2,
} from '../docs/types/QqSysEmoji'
import { homedir } from 'os'
import {
  AssetHashMap,
  collectEmojiIds,
  compareQqVersions,
  computeVariantSeen,
  computeVersionFields,
  planEmojiSync,
} from './qqEmojiArchive'

/**
 * QQ Emoji 资源生成器
 *
 * 此脚本自动从 QQ 的软件文件夹中读取 Emoji 相关的资源文件
 * 增量同步到 public/assets/qq_emoji：被替换或删除的旧文件移入 <emojiId>/_history/<版本>/，
 * 从 QQ 中消失的表情原样保留并标记为已下架
 * 并生成 v1 / v2 两份索引文件
 * 目前只支持 macOS 系统
 */

// 配置常量
const CONFIG = {
  PLATFORM: 'darwin' as const,
  QQNT_APP_SUPPORT_PATH:
    'Library/Containers/com.tencent.qq/Data/Library/Application Support/QQ',
  FACE_CONFIG_RELATIVE_PATH:
    'global/nt_data/Emoji/emoji-resource/face_config.json',
  // curVersion 为 QQ 当前实际运行的版本（含热更新）；/Applications/QQ.app 的 Info.plist 是初装版本，不可用
  VERSIONS_CONFIG_RELATIVE_PATH: 'versions/config.json',
  // 应用包内自带的表情面板配置，含分组名与联想词，比 face_config.json 更丰富
  DEFAULT_CONFIG_RELATIVE_PATH:
    'QQUpdate.app/Contents/Resources/app/resource/default-emojis/default_config.json',
  EMOJI_RESOURCE_RELATIVE_PATH:
    'nt_data/Emoji/BaseEmojiSyastems/EmojiSystermResource',
  // 手动维护的补充面板配置（fetchFullSysEmojis 响应，结构同 default_config.json），
  // 用于补全 face_config / default_config 未覆盖的新表情元数据
  SUPPLEMENT_CONFIG_RELATIVE_PATH: 'scripts/data/sys_emoji_supplement.json',
  OUTPUT_RELATIVE_PATH: 'public/assets/qq_emoji',
  INDEX_FILE_NAME: '_index.json',
  INDEX_V2_FILE_NAME: '_index.v2.json',
  FACE_CONFIG_FILE_NAME: 'face_config.json',
  HISTORY_DIR_NAME: '_history',
} as const

// 拷贝与索引时需要跳过的系统垃圾文件
const JUNK_FILE_NAMES = new Set(['.DS_Store', '__MACOSX', 'Thumbs.db'])

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

  constructor() {
    this.projectRoot = resolve(import.meta.dirname, '..')
    this.qqntAppSupportDir = resolve(homedir(), CONFIG.QQNT_APP_SUPPORT_PATH)
    this.faceConfigFile = resolve(
      this.qqntAppSupportDir,
      CONFIG.FACE_CONFIG_RELATIVE_PATH
    )
    this.outputDir = resolve(this.projectRoot, CONFIG.OUTPUT_RELATIVE_PATH)
  }

  getFaceConfigFile(): string {
    return this.faceConfigFile
  }

  getOutputDir(): string {
    return this.outputDir
  }

  getOutputConfigFile(): string {
    return resolve(this.outputDir, CONFIG.INDEX_FILE_NAME)
  }

  getOutputConfigV2File(): string {
    return resolve(this.outputDir, CONFIG.INDEX_V2_FILE_NAME)
  }

  getSupplementConfigFile(): string {
    return resolve(this.projectRoot, CONFIG.SUPPLEMENT_CONFIG_RELATIVE_PATH)
  }

  getHistoryDir(emojiId: string, version: string): string {
    return resolve(this.outputDir, emojiId, CONFIG.HISTORY_DIR_NAME, version)
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
   * 读取 QQ 当前运行版本，例如 7.0.2-53644
   */
  async getCurrentQqVersion(): Promise<string> {
    const config: { curVersion?: string } = JSON.parse(
      await readFile(
        resolve(this.qqntAppSupportDir, CONFIG.VERSIONS_CONFIG_RELATIVE_PATH),
        'utf-8'
      )
    )
    if (!config.curVersion) {
      throw new Error('versions/config.json 中没有 curVersion')
    }
    return config.curVersion
  }

  getDefaultConfigFile(version: string): string {
    return resolve(
      this.qqntAppSupportDir,
      'versions',
      version,
      CONFIG.DEFAULT_CONFIG_RELATIVE_PATH
    )
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
  private readonly emojiMap = new Map<string, QqSysEmojiV2>()

  /**
   * 创建默认的 Emoji 对象
   */
  private createDefaultEmoji(
    emojiId: string,
    partial?: Partial<QqSysEmojiItem>
  ): QqSysEmojiV2 {
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
  private createEmojiFromNTItem(item: QqNTSystemEmojiItem): QqSysEmojiV2 {
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
  getOrCreateEmoji(emojiId: string): QqSysEmojiV2 {
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
   * 将一条 default_config 面板表情合并进现有 Emoji
   * default_config 字段更丰富（describe / associateWords / aniSticker 信息），
   * 存在的真值字段优先覆盖 face_config，缺失则保留原值
   */
  private mergeDefaultConfigItem(item: QqSysEmojiItem): void {
    const existing = this.emojiMap.get(item.emojiId)

    if (!existing) {
      this.emojiMap.set(
        item.emojiId,
        this.createDefaultEmoji(item.emojiId, {
          describe: item.describe,
          qzoneCode: item.qzoneCode,
          qcid: item.qcid,
          emojiType: item.emojiType,
          aniStickerPackId: item.aniStickerPackId,
          aniStickerId: item.aniStickerId,
          associateWords: item.associateWords ?? [],
          isHide: item.isHide,
          animationWidth: item.animationWidth,
          animationHeigh: item.animationHeigh,
        })
      )
      return
    }

    existing.describe = item.describe || existing.describe
    existing.qzoneCode = item.qzoneCode || existing.qzoneCode
    existing.qcid = item.qcid || existing.qcid
    existing.emojiType = item.emojiType || existing.emojiType
    existing.aniStickerPackId =
      item.aniStickerPackId || existing.aniStickerPackId
    existing.aniStickerId = item.aniStickerId || existing.aniStickerId
    existing.associateWords = item.associateWords?.length
      ? item.associateWords
      : existing.associateWords
    existing.animationWidth = item.animationWidth || existing.animationWidth
    existing.animationHeigh = item.animationHeigh || existing.animationHeigh
  }

  /**
   * 从应用自带的 default_config.json 加载并富化 Emoji 数据
   */
  async loadFromDefaultConfig(defaultConfigFile: string): Promise<void> {
    const config: QQSysEmojiConfig = JSON.parse(
      await readFile(defaultConfigFile, 'utf-8')
    )

    // 遍历所有面板（normalPanelResult / redHeartPanelResult / 其它）
    const panels: { SysEmojiGroupList: QqSysEmojiGroup[] }[] =
      Object.values(config)
    for (const panel of panels) {
      for (const group of panel.SysEmojiGroupList ?? []) {
        for (const item of group.SysEmojiList ?? []) {
          this.mergeDefaultConfigItem(item)
        }
      }
    }
  }

  /**
   * 写入版本字段；已下架表情在配置中已无元数据时沿用上一份索引的元数据
   * @param sourceEmojiIds 本次 QQ 资源目录中含资源的表情
   * @param archivedEmojiIds 本次有旧文件被移入 _history 的表情
   */
  applyVersionFields(
    sourceEmojiIds: Set<string>,
    archivedEmojiIds: Set<string>,
    prev: QqEmojiIndexV2,
    curVersion: string
  ): void {
    const prevMap = new Map(prev.emojis.map((emoji) => [emoji.emojiId, emoji]))

    for (const emoji of this.emojiMap.values()) {
      const p = prevMap.get(emoji.emojiId)
      const inSource = sourceEmojiIds.has(emoji.emojiId)

      if (!inSource && !emoji.describe && p) {
        const {
          assets: _assets,
          history: _history,
          firstSeenIn: _firstSeenIn,
          lastSeenIn: _lastSeenIn,
          assetsFirstSeenIn: _assetsFirstSeenIn,
          removed: _removed,
          ...meta
        } = p
        Object.assign(emoji, meta)
      }

      Object.assign(
        emoji,
        computeVersionFields(inSource, emoji.assets.length > 0, p, curVersion)
      )

      const variantSeen = computeVariantSeen(
        emoji.history?.map((entry) => entry.lastSeenIn) ?? [],
        p,
        archivedEmojiIds.has(emoji.emojiId),
        prev.qqntVersion,
        curVersion
      )
      if (variantSeen.assetsFirstSeenIn) {
        emoji.assetsFirstSeenIn = variantSeen.assetsFirstSeenIn
      }
      emoji.history = emoji.history?.map(({ lastSeenIn, assets }) => {
        const firstSeenIn = variantSeen.historyFirstSeenIn.get(lastSeenIn)
        return firstSeenIn
          ? { firstSeenIn, lastSeenIn, assets }
          : { lastSeenIn, assets }
      })
    }
  }

  /**
   * 列出资源存在但仍缺元数据（describe 为空）的表情 id，
   * 用于提示维护者更新 sys_emoji_supplement.json
   */
  getEmojiIdsMissingMeta(): string[] {
    return Array.from(this.emojiMap.values())
      .filter((emoji) => emoji.assets.length > 0 && !emoji.describe)
      .map((emoji) => emoji.emojiId)
  }

  /**
   * 获取排序后的 Emoji 列表
   */
  getSortedEmojiList(): QqSysEmojiV2[] {
    const sortAssets = (assets: QqSysEmojiAsset[]) =>
      // 排序资源文件，优先级：png > apng > lottie
      assets.sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name)
        }
        return a.type - b.type
      })

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
        .map((emoji) => {
          sortAssets(emoji.assets)
          emoji.history?.forEach((entry) => sortAssets(entry.assets))
          return emoji
        })
    )
  }
}

/**
 * 同步结果，用于结束时提示维护者
 */
interface SyncResult {
  sourceEmojiIds: Set<string>
  archivedEmojiIds: Set<string>
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

  async readIndexV2(): Promise<QqEmojiIndexV2> {
    const file = this.pathManager.getOutputConfigV2File()
    if (!(await this.exists(file))) {
      // 历史文件需按上次同步的版本归档，没有上一份 v2 索引就无从得知
      throw new Error(`缺少上一份索引 ${file}，无法确定历史版本归属`)
    }
    return JSON.parse(await readFile(file, 'utf-8'))
  }

  /**
   * 列出 <emojiId>/{png,apng,lottie}/** 的文件及内容哈希，键使用 `/` 分隔
   */
  async listAssetFiles(rootDir: string): Promise<AssetHashMap> {
    const result: AssetHashMap = new Map()
    const emojiDirs = await readdir(rootDir, { withFileTypes: true })

    for (const emojiDir of emojiDirs) {
      if (!emojiDir.isDirectory()) {
        continue
      }
      for (const typeDir of Object.keys(ASSET_TYPE_CONFIG)) {
        const dirPath = resolve(rootDir, emojiDir.name, typeDir)
        if (!(await this.exists(dirPath))) {
          continue
        }
        const files = await readdir(dirPath, {
          recursive: true,
          withFileTypes: true,
        })
        for (const file of files) {
          if (!file.isFile() || JUNK_FILE_NAMES.has(file.name)) {
            continue
          }
          const fullPath = resolve(file.parentPath, file.name)
          const key = relative(rootDir, fullPath).split(sep).join('/')
          const hash = createHash('sha1')
            .update(await readFile(fullPath))
            .digest('hex')
          result.set(key, hash)
        }
      }
    }

    return result
  }

  /**
   * 增量同步 QQ 资源目录到输出目录
   * @param archiveVersion 被替换的旧文件归入的版本，即上一次同步的版本
   */
  async syncResourceFiles(
    qqntEmojiAssetsDir: string,
    archiveVersion: string
  ): Promise<SyncResult> {
    const outputDir = this.pathManager.getOutputDir()
    await mkdir(outputDir, { recursive: true })

    const source = await this.listAssetFiles(qqntEmojiAssetsDir)
    const target = await this.listAssetFiles(outputDir)
    const plan = planEmojiSync(source, target)

    for (const key of plan.archive) {
      const [emojiId, ...rest] = key.split('/')
      const dest = resolve(
        this.pathManager.getHistoryDir(emojiId, archiveVersion),
        ...rest
      )
      if (await this.exists(dest)) {
        // 同一版本下同一文件被替换两次，需人工确认保留哪份
        throw new Error(`历史文件已存在，拒绝覆盖: ${dest}`)
      }
      await mkdir(dirname(dest), { recursive: true })
      await rename(resolve(outputDir, ...key.split('/')), dest)
    }

    for (const key of plan.copy) {
      const dest = resolve(outputDir, ...key.split('/'))
      await mkdir(dirname(dest), { recursive: true })
      await copyFile(resolve(qqntEmojiAssetsDir, ...key.split('/')), dest)
    }

    // 资源目录顶层的 *_emojiids.json 等文件与 face_config.json 直接覆盖
    const topEntries = await readdir(qqntEmojiAssetsDir, { withFileTypes: true })
    for (const entry of topEntries) {
      if (entry.isFile() && !JUNK_FILE_NAMES.has(entry.name)) {
        await copyFile(
          resolve(qqntEmojiAssetsDir, entry.name),
          resolve(outputDir, entry.name)
        )
      }
    }
    await copyFile(
      this.pathManager.getFaceConfigFile(),
      resolve(outputDir, CONFIG.FACE_CONFIG_FILE_NAME)
    )

    console.log(
      `资源同步完成：复制 ${plan.copy.length} 个文件，归档 ${plan.archive.length} 个文件`
    )

    return {
      sourceEmojiIds: collectEmojiIds(source),
      archivedEmojiIds: collectEmojiIds(
        new Map(plan.archive.map((key) => [key, '']))
      ),
    }
  }

  /**
   * 处理指定目录下的资源文件
   */
  async collectAssets(dirPath: string): Promise<QqSysEmojiAsset[]> {
    const assets: QqSysEmojiAsset[] = []

    for (const [dirName, assetType] of Object.entries(ASSET_TYPE_CONFIG)) {
      const typeDir = resolve(dirPath, dirName)
      if (!(await this.exists(typeDir))) {
        continue
      }

      const files = await readdir(typeDir, {
        recursive: true,
        withFileTypes: true,
      })

      for (const file of files) {
        if (!file.isFile() || JUNK_FILE_NAMES.has(file.name)) {
          continue
        }
        assets.push({
          type: assetType,
          name: file.name,
          path: this.pathManager.getRelativePath(
            resolve(file.parentPath, file.name)
          ),
        })
      }
    }

    return assets
  }

  /**
   * 处理所有 Emoji 资源（含 _history 下的历史版本）
   */
  async processAllEmojiAssets(emojiManager: EmojiManager): Promise<void> {
    const outputDir = this.pathManager.getOutputDir()
    const entries = await readdir(outputDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue
      }

      const emojiId = entry.name
      const emojiDir = resolve(outputDir, emojiId)
      const emoji = emojiManager.getOrCreateEmoji(emojiId)
      emoji.assets.push(...(await this.collectAssets(emojiDir)))

      const historyRoot = resolve(emojiDir, CONFIG.HISTORY_DIR_NAME)
      if (!(await this.exists(historyRoot))) {
        continue
      }
      const versionDirs = (
        await readdir(historyRoot, { withFileTypes: true })
      ).filter((dir) => dir.isDirectory())
      const history = await Promise.all(
        versionDirs.map(async (dir) => ({
          lastSeenIn: dir.name,
          assets: await this.collectAssets(resolve(historyRoot, dir.name)),
        }))
      )
      const nonEmpty = history
        .filter((entry) => entry.assets.length > 0)
        .sort((a, b) => compareQqVersions(b.lastSeenIn, a.lastSeenIn))
      if (nonEmpty.length > 0) {
        emoji.history = nonEmpty
      }
    }
  }

  /**
   * 生成索引文件：v2 含全部字段；v1 结构保持不变，只含未下架表情
   */
  async generateIndexFiles(
    emojiList: QqSysEmojiV2[],
    curVersion: string
  ): Promise<void> {
    const indexV2: QqEmojiIndexV2 = {
      qqntVersion: curVersion,
      // history 放最后，便于阅读 diff
      emojis: emojiList.map(({ history, ...rest }) =>
        history ? { ...rest, history } : rest
      ),
    }
    await writeFile(
      this.pathManager.getOutputConfigV2File(),
      JSON.stringify(indexV2, null, 2)
    )

    const indexV1: QqSysEmojiWithAssets[] = emojiList
      .filter((emoji) => !emoji.removed)
      .map(
        ({
          firstSeenIn: _firstSeenIn,
          lastSeenIn: _lastSeenIn,
          assetsFirstSeenIn: _assetsFirstSeenIn,
          removed: _removed,
          history: _history,
          ...rest
        }) => rest
      )
    await writeFile(
      this.pathManager.getOutputConfigFile(),
      JSON.stringify(indexV1, null, 2)
    )

    console.log(`索引文件已生成: ${this.pathManager.getOutputDir()}`)
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

      const curVersion = await this.pathManager.getCurrentQqVersion()
      console.log(`QQ 当前版本: ${curVersion}`)

      const prevIndex = await this.fileManager.readIndexV2()
      console.log(`上次同步版本: ${prevIndex.qqntVersion}`)

      // 查找 QQNT Emoji 资源目录
      console.log('正在查找 QQNT Emoji 资源目录...')
      const qqntEmojiAssetsDir =
        await this.pathManager.findLatestQqntEmojiAssetsDir()
      console.log(`找到资源目录: ${qqntEmojiAssetsDir}`)

      // 增量同步资源文件
      console.log('正在同步资源文件...')
      const { sourceEmojiIds, archivedEmojiIds } =
        await this.fileManager.syncResourceFiles(
          qqntEmojiAssetsDir,
          prevIndex.qqntVersion
        )

      // 加载配置文件（face_config 提供基础覆盖）
      console.log('正在加载配置文件...')
      await this.emojiManager.loadFromConfig(
        this.pathManager.getFaceConfigFile()
      )

      // 加载应用自带的 default_config，富化分组、联想词等信息
      const defaultConfigFile = this.pathManager.getDefaultConfigFile(curVersion)
      console.log(`正在加载面板配置: ${defaultConfigFile}`)
      await this.emojiManager.loadFromDefaultConfig(defaultConfigFile)

      // 加载手动维护的补充面板配置（覆盖前两者未收录的新表情元数据）
      const supplementConfigFile = this.pathManager.getSupplementConfigFile()
      if (await this.fileManager.exists(supplementConfigFile)) {
        console.log(`正在加载补充面板配置: ${supplementConfigFile}`)
        await this.emojiManager.loadFromDefaultConfig(supplementConfigFile)
      } else {
        console.log('未找到补充面板配置，跳过')
      }

      // 处理所有 Emoji 资源
      console.log('正在处理 Emoji 资源...')
      await this.fileManager.processAllEmojiAssets(this.emojiManager)

      this.emojiManager.applyVersionFields(
        sourceEmojiIds,
        archivedEmojiIds,
        prevIndex,
        curVersion
      )

      // 提示仍缺元数据的表情（资源已提取但配置未收录，索引中只有最简条目）
      const missingMetaIds = this.emojiManager.getEmojiIdsMissingMeta()
      if (missingMetaIds.length > 0) {
        console.warn(
          `⚠️ 以下 ${missingMetaIds.length} 个表情缺少元数据（describe 为空），` +
            `可通过 NapCat dump 插件更新 ${CONFIG.SUPPLEMENT_CONFIG_RELATIVE_PATH}：\n` +
            missingMetaIds.join(', ')
        )
      }

      // 生成索引文件
      console.log('正在生成索引文件...')
      const emojiList = this.emojiManager.getSortedEmojiList()
      await this.fileManager.generateIndexFiles(emojiList, curVersion)

      this.printReport(emojiList, prevIndex, archivedEmojiIds, curVersion)

      console.log('✅ QQ Emoji 资源生成完成！')
    } catch (error) {
      console.error('❌ 生成过程中出现错误:', error)
      throw error
    }
  }

  private printReport(
    emojiList: QqSysEmojiV2[],
    prevIndex: QqEmojiIndexV2,
    archivedEmojiIds: Set<string>,
    curVersion: string
  ): void {
    const prevMap = new Map(
      prevIndex.emojis.map((emoji) => [emoji.emojiId, emoji])
    )
    const added = emojiList.filter(
      (emoji) =>
        emoji.firstSeenIn === curVersion &&
        !prevMap.get(emoji.emojiId)?.lastSeenIn
    )
    const removed = emojiList.filter(
      (emoji) => emoji.removed && !prevMap.get(emoji.emojiId)?.removed
    )
    const format = (emojis: QqSysEmojiV2[]) =>
      emojis.map((emoji) => `${emoji.emojiId}${emoji.describe}`).join(', ')

    console.log('—'.repeat(40))
    console.log(`新增表情 ${added.length} 个: ${format(added)}`)
    console.log(`新下架表情 ${removed.length} 个: ${format(removed)}`)
    console.log(
      `归档旧版本的表情 ${archivedEmojiIds.size} 个: ${[...archivedEmojiIds].join(', ')}` +
        (archivedEmojiIds.size
          ? `\n  请检查 <emojiId>/${CONFIG.HISTORY_DIR_NAME}/${prevIndex.qqntVersion}/，无意义的旧版（如单帧占位图）可删除后重新生成`
          : '')
    )
    console.log(`建议 commit message: chore: qqnt ${curVersion}`)
    console.log('—'.repeat(40))
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
