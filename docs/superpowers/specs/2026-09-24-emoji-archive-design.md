# QQNT 表情归档：保留下架表情与历史版本

## 目标

- QQ 从资源包中删除的表情（季节限定等）继续保留在展示库，并标注为已下架。
- 表情资源被 QQ 替换时，旧文件作为历史版本保留，可在详情页切换查看。
- 记录每个表情被本库首次 / 最后一次同步到的 QQ 版本。
- 以上均由 `pnpm run gen:qqnt` 自动完成；现有 `_index.json` 对第三方保持不变。

## 版本号来源

读取 `~/Library/Containers/com.tencent.qq/Data/Library/Application Support/QQ/versions/config.json` 的 `curVersion`（形如 `7.0.2-53644`），作为本次同步的版本 `curVersion`。

`default_config.json` 改为直接从 `versions/<curVersion>/QQUpdate.app/Contents/Resources/app/resource/default-emojis/default_config.json` 读取，删除按 mtime 挑选版本目录的逻辑。

`/Applications/QQ.app` 的 Info.plist 是初装版本，热更新后不变，不可用。

## 版本字段语义

版本字段来自本库的同步记录，同步由维护者不定期手动执行，**不是** QQ 官方的上架 / 下架版本：

- `firstSeenIn`：本库第一次同步到该表情资源的版本。表情实际上架可能更早（上界）。
- `lastSeenIn`：本库最后一次同步到该表情资源的版本。表情实际删除发生在此之后、下一次同步之前（下界）。
- 「同步到」指 QQ 资源目录中存在 `<emojiId>/` 资源目录；仅在配置文件中出现、从无资源目录的条目不设任何版本字段。

## 资源目录布局

```
public/assets/qq_emoji/
  <emojiId>/
    png/ apng/ lottie/          # 当前版本
    _history/<lastSeenIn>/      # 最后见于 <lastSeenIn> 的旧文件
      png/ apng/ lottie/
  _index.json                   # v1，结构不变
  _index.v2.json                # v2
```

## 索引

### `_index.json`（v1）

结构与现状完全一致，只包含未下架（`removed` 不为真）的表情，不含 v2 新增字段。对现有表情，同一份 QQ 数据生成的 v1 索引与现状逐字节相同。

### `_index.v2.json`

```ts
interface QqEmojiIndexV2 {
  qqntVersion: string // 最近一次同步的 curVersion
  emojis: QqSysEmojiV2[] // 含已下架表情，排序规则同 v1
}

interface QqSysEmojiHistory {
  lastSeenIn: string // 即 _history 下的目录名
  assets: QqSysEmojiAsset[]
}

interface QqSysEmojiV2 extends QqSysEmojiWithAssets {
  firstSeenIn?: string
  lastSeenIn?: string
  removed?: true
  history?: QqSysEmojiHistory[] // 按 lastSeenIn 降序；无历史时省略
}
```

版本号比较：按 `.` / `-` 切分后逐段数值比较（`6.9.87-44204` < `6.9.98-51102` < `7.0.2-53644`）。

## 同步算法

不再把输出目录整体移到 `.backup` 后全量复制（删除 `backupExistingFiles` 与 `BACKUP_RELATIVE_PATH`，git 即备份）。流程：

1. 读取 `curVersion`；读取上一份 `_index.v2.json` 为 `prev`（不存在则报错终止，首份由数据补录生成）。
2. 分别列出 QQ 资源目录与输出目录下 `<emojiId>/{png,apng,lottie}/**` 的文件及内容哈希（`_history/` 不参与比较，跳过 `JUNK_FILE_NAMES`）。
3. 纯函数 `planEmojiSync(source, target)` 得出动作：
   - 源有、目标无 → `copy`
   - 两边都有且哈希不同 → `archive` + `copy`
   - 两边都有且哈希相同 → 无动作
   - 表情目录在源中存在，但目标中某文件在源中不存在 → `archive`
   - 表情目录在源中整体不存在 → 无动作
4. 执行动作。`archive` 把旧文件移入 `<emojiId>/_history/<prev.qqntVersion>/` 下的同一相对路径；目标文件已存在时报错终止。
5. `face_config.json` 照旧覆盖复制到输出目录。
6. 照旧加载 face_config / default_config / 补充配置，扫描当前资源；扫描 `<emojiId>/_history/*/{png,apng,lottie}` 生成 `history`。
7. 逐个表情计算版本字段（`p` 为 `prev.emojis` 中同 id 条目）：
   - 源中存在该表情目录：`lastSeenIn = curVersion`；`firstSeenIn = p?.lastSeenIn ? p.firstSeenIn : curVersion`（`p.firstSeenIn` 缺省时保持缺省）；不设 `removed`。
   - 源中不存在、输出目录中存在：`removed = true`；`firstSeenIn` / `lastSeenIn` 沿用 `p`。
   - 两处都不存在：不设版本字段。
8. 已下架表情的元数据在配置加载后 `describe` 仍为空时，沿用 `p` 的元数据字段（`assets`、`history`、版本字段除外）。
9. 写出 `_index.v2.json` 与 `_index.json`。

## 同步结束输出

- 本次归档了旧文件的表情 id（便于检查并删除无意义的旧版，例如单帧占位图被补成动画的情况；删除对应 `_history/<version>/` 目录后重新生成即可）。
- 本次新下架的表情 id（`removed` 且 `p` 未下架）。
- 本次新增的表情 id（`firstSeenIn === curVersion`）。
- 建议的 commit message：`chore: qqnt <curVersion>`。

## 前端

- store 改为读取 `_index.v2.json`，`allEmojiList` 取 `emojis`，并暴露 `qqntVersion`。
- 列表页标题区显示「数据同步自 QQ <qqntVersion>」。
- `QEmojiMiniCard`：`removed` 时显示「已下架」标记。
- `pages/qqnt/[id].vue`：
  - 元信息区显示「收录于 <firstSeenIn>」「最后见于 <lastSeenIn>」（缺省则不显示对应项），`removed` 时显示「已下架」徽章。
  - `history` 非空时在详情内容顶部显示版本标签页：第一个为当前资源（标签为该表情的 `lastSeenIn`，标注「最新」），其后按 `history` 顺序排列。默认选中当前资源。
  - 选中的标签决定整页使用的资源集合 `activeAssets`：头部预览、下载、转 GIF、复制、图片资源区、动画文件区均基于 `activeAssets`。元数据区不随标签变化。

## 数据补录

一次性脚本（放在临时目录，不入库）根据 git 历史生成首份 `_index.v2.json` 所需的版本字段与历史文件。同步提交与版本对应：

| 提交 | 版本 |
|---|---|
| `1211f8a` | 基线（版本未知） |
| `a24f2e4` | `6.9.82-40366` |
| `848b168` 至 `851fcd8` | 取自 commit message `chore: qqnt <version>` |

`a24f2e4` 的 commit message 只有 build 号 `40366`。NapCatQQ `packages/napcat-core/external/appid.json` 中 Windows `9.9.22` 起于 build `40362`，macOS `6.9.82` 与 Windows `9.9.22` 同属 build `40768`，据此推定为 `6.9.82-40366`。

- `firstSeenIn`：表情目录首次出现的提交对应版本；出现在基线中的不设。
- `lastSeenIn`：当前均存在，取 `7.0.2-53644`。
- 历史文件：从 `381a3bc^` 取出 `332/png/332.png`、`332/apng/332.png`（「/举牌牌」2025 版），放入 `332/_history/6.9.86-42941/` 对应子目录。`344` 在该提交中的旧 apng 是单帧占位图，不补录。
- 补录后运行 `gen:qqnt` 生成正式索引。

## 测试

使用 `node:test`，经 `tsx` 运行。`planEmojiSync`、版本字段计算、版本号比较提取为无文件系统依赖的纯函数，测试覆盖：

- 新增文件 → copy
- 同名文件内容变化 → archive + copy
- 表情内单个文件被删除 → archive
- 整个表情目录消失 → 无动作，版本字段计算得出 `removed`，`firstSeenIn` / `lastSeenIn` 沿用
- 下架后重新上架 → 不再 `removed`，`lastSeenIn` 更新，`firstSeenIn` 不变
- 首次出现资源的表情（`p` 无 `lastSeenIn`）→ `firstSeenIn = curVersion`
- 基线表情（`p` 有 `lastSeenIn` 无 `firstSeenIn`）→ `firstSeenIn` 保持缺省
- 版本号比较

最后在本机运行一次 `gen:qqnt`，确认 `_index.json` 无 diff、`_index.v2.json` 符合预期。

## 文档

README 的 QQNT 部分补充：`_index.v2.json` 地址与结构、版本字段语义（来自本库同步记录，非官方上下架版本）、已下架表情与历史版本的保留规则、`curVersion` 来源。
