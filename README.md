# QQNT 表情库

探索腾讯QQ的完整表情资源，包含高清图片、APNG 和 Lottie 动画文件。

## QQNT

> 与 macOS 版同步，由仓库维护者手动同步，可能会有一些表情缺失。

- 在线预览：https://koishi.js.org/QFace/#/qqnt
- API 接口：https://koishi.js.org/QFace/assets/qq_emoji/_index.json
- API 接口（v2）：https://koishi.js.org/QFace/assets/qq_emoji/_index.v2.json

QQ 从资源包中删除的表情（如季节限定表情）和被替换掉的旧版资源都会保留在本库中。

`_index.json` 结构保持不变，只包含当前仍在 QQ 中的表情。`_index.v2.json` 包含全部表情及以下附加信息：

```ts
interface QqEmojiIndexV2 {
  qqntVersion: string // 最近一次同步的 QQ 版本，例如 "7.0.2-53644"
  emojis: (QqSysEmojiWithAssets & {
    firstSeenIn?: string // 本库首次同步到该表情的 QQ 版本
    lastSeenIn?: string // 本库最后一次同步到该表情的 QQ 版本
    assetsFirstSeenIn?: string // 当前这一版资源首次同步到的 QQ 版本，仅在有历史版本时存在
    removed?: true // 已从 QQ 中删除
    history?: {
      firstSeenIn?: string // 这一版资源首次同步到的 QQ 版本
      lastSeenIn: string // 这一版资源最后一次同步到的 QQ 版本
      assets: QqSysEmojiAsset[]
    }[]
  })[]
}
```

> [!NOTE]
> 版本字段来自本库的同步记录，同步不定期手动执行，**不是**官方的上架 / 下架版本：表情实际上架可能早于 `firstSeenIn`，实际删除发生在 `lastSeenIn` 之后。仅有配置、从未有过资源文件的条目不含版本字段。

## 微信

> 不经常更新，可能会有一些表情缺失。

- 在线预览：https://koishi.js.org/QFace/#/wechat
- API 接口：https://koishi.js.org/QFace/assets/wechat_emoji/_index.json

---

## Development

### Generate QQNT Emoji Indexes

> Currently only works on macOS.

```bash
pnpm run gen:qqnt
```

What does it do?

1. Reads `versions/config.json` under `Library/Containers/com.tencent.qq/Data/Library/Application Support/QQ` for the running QQ version (`curVersion`)
2. Syncs `nt_qq_*/nt_data/Emoji/BaseEmojiSyastems/EmojiSystermResource` into `public/assets/qq_emoji` file by file:
   - changed or dropped files are moved to `<emojiId>/_history/<last synced version>/` before being replaced
   - emojis missing from QQ are kept and marked `removed`
3. Reads metadata from `global/nt_data/Emoji/emoji-resource/face_config.json` and `versions/<curVersion>/.../default-emojis/default_config.json`
4. Writes `_index.json` and `_index.v2.json`, then prints new / removed / archived emojis and a suggested commit message

The previous `_index.v2.json` is required. Review the archived files it reports; delete meaningless ones (e.g. a single-frame placeholder later replaced by a real animation) and re-run.

```bash
pnpm test  # unit tests for the sync planner
```

### Generate WeChat Emoji Indexes

```bash
pnpm run gen:wechat
```

> Currently broken.

---

所有表情资源均来自腾讯官方，版权归腾讯公司所有。仅供学习交流使用，请勿用于商业用途。

本仓库代码由 Koishi 团队维护，采用 MIT 协议开源。
