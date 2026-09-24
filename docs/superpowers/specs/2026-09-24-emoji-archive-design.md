# QQNT 表情归档：保留下架表情与历史版本

## 目标

- QQ 从资源包中删除的表情（季节限定等）继续保留在展示库，并标注为已下架。
- 表情资源被 QQ 替换时，旧文件作为历史版本保留，可在详情页查看。
- 以上均由 `pnpm run gen:qqnt` 自动完成。

## 版本号来源

读取 `~/Library/Containers/com.tencent.qq/Data/Library/Application Support/QQ/versions/config.json` 的 `curVersion`（形如 `7.0.2-53644`），作为本次同步的版本标签。

`default_config.json` 改为直接从 `versions/<curVersion>/QQUpdate.app/Contents/Resources/app/resource/default-emojis/default_config.json` 读取，删除按 mtime 挑选版本目录的逻辑。

`/Applications/QQ.app` 的 Info.plist 是初装版本，热更新后不变，不可用。

## 资源目录布局

```
public/assets/qq_emoji/
  <emojiId>/
    png/ apng/ lottie/            # 当前版本
    _history/<version>/           # 在 <version> 同步时被替换或删除的旧文件
      png/ apng/ lottie/
```

`<version>` 是**发生替换的那次同步**的 `curVersion`。

## 同步算法

不再把输出目录整体移到 `.backup` 后全量复制（删除 `backupExistingFiles` 与 `BACKUP_RELATIVE_PATH`，git 即备份）。改为逐文件增量同步：

1. 分别列出 QQ 资源目录与输出目录下 `<emojiId>/{png,apng,lottie}/**` 的文件及内容哈希（`_history/` 不参与比较，跳过 `JUNK_FILE_NAMES`）。
2. 由纯函数 `planEmojiSync(source, target)` 得出动作：
   - 源有、目标无 → `copy`
   - 两边都有且哈希不同 → `archive`（旧文件移入 `_history/<version>/` 同一相对路径）+ `copy`
   - 两边都有且哈希相同 → 无动作
   - 表情目录在源中存在，但目标中某文件在源中不存在 → `archive`
   - 表情目录在源中整体不存在 → 不动，记入 `removedIds`
3. 执行动作。`archive` 的目标文件已存在时抛错终止（同一 `curVersion` 下资源被替换两次，需人工处理）。
4. `face_config.json` 照旧覆盖复制到输出目录。

## `_index.json` 字段（只增不改）

```ts
interface QqSysEmojiHistory {
  version: string // _history 下的目录名
  assets: QqSysEmojiAsset[]
}

interface QqSysEmojiWithAssets extends QqSysEmojiItem {
  assets: QqSysEmojiAsset[]
  removedIn?: string
  history?: QqSysEmojiHistory[]
}
```

- `history`：扫描 `<emojiId>/_history/*/{png,apng,lottie}` 生成，按版本号降序（按 `.`/`-` 切分后逐段数值比较）。无历史时省略该字段。手动删除某个 `_history/<version>` 目录后重新生成即可去掉该版本。
- `removedIn`：仅对 `removedIds` 中的表情设置，取上一版 `_index.json` 中该表情的 `removedIn`，没有则取本次 `curVersion`。表情重新出现在源中时不再设置。
- 已下架表情的元数据：照常由 face_config / default_config / 补充配置填充；填充后 `describe` 仍为空时，用上一版 `_index.json` 中该条目的元数据字段（`assets`、`history`、`removedIn` 除外）。
- 上一版 `_index.json` 在同步开始前读入；文件不存在时视为空。

## 同步结束输出

- 本次归档了旧版本的表情 id 列表（便于维护者检查并删除无意义的旧版，例如只是单帧占位图被补成动画的情况）。
- 本次新下架的表情 id 列表（`removedIn === curVersion`）。
- 建议的 commit message：`chore: qqnt <curVersion>`。

## 前端

- `QEmojiMiniCard`：`removedIn` 存在时在卡片上显示「已下架」标记。
- `pages/qqnt/[id].vue`：
  - 元信息区在 `removedIn` 存在时显示「已下架（自 <removedIn>）」徽章。
  - `history` 非空时新增「历史版本」区块，按版本分组，每组标题为「<version> 之前」，图片资源复用现有 asset-item 的预览 / 下载 / 新窗口打开交互；Lottie 文件只提供下载与新窗口打开。

## 数据补录

从提交 `381a3bc^` 取出 `332/png/332.png`、`332/apng/332.png`（「/举牌牌」2025 版），放入 `332/_history/6.9.87-44204/` 对应子目录，重新生成索引。

## 测试

使用 `node:test`，经 `tsx` 运行。`planEmojiSync` 与版本比较提取为无文件系统依赖的纯函数，测试覆盖：

- 新增文件 → copy
- 同名文件内容变化 → archive + copy
- 表情内单个文件被删除 → archive
- 整个表情目录消失 → removedIds，且不产生任何动作
- 下架后重新上架 → 不在 removedIds 中
- 版本号比较：`6.9.87-44204` < `6.9.98-51102` < `7.0.2-53644`

最后在本机实际运行一次 `gen:qqnt`，确认当前版本同步无意外 diff。

## 文档

README 的 QQNT 部分补充：已下架表情与历史版本的保留规则、`removedIn` / `history` 字段说明、版本号来源。
