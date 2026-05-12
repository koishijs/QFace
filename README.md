# QQNT 表情库

探索腾讯QQ的完整表情资源，包含高清图片、APNG 和 Lottie 动画文件。

## QQNT

> 与 macOS 版同步，由仓库维护者手动同步，可能会有一些表情缺失。

- 在线预览：https://emoji.inis.cn/qqnt
- 原始资源索引：https://emoji.inis.cn/assets/qq/_index.json
- 统一格式索引：https://emoji.inis.cn/indexes/qq/index.json

## 微信

> 不经常更新，可能会有一些表情缺失。

- 在线预览：https://emoji.inis.cn/wechat
- 原始资源索引：https://emoji.inis.cn/assets/wechat/_index.json
- 统一格式索引：https://emoji.inis.cn/indexes/wechat/index.json

## 哔哩哔哩

- 在线预览：https://emoji.inis.cn/bilibili
- 原始资源索引：https://emoji.inis.cn/assets/bilibili/_index.json
- 统一格式分组列表：https://emoji.inis.cn/indexes/bilibili/index.json
- 单分组数据（示例）：https://emoji.inis.cn/indexes/bilibili/1.json

---

## Development

### Generate QQNT Emoji Indexes

> 支持 macOS 和 Windows 系统。

```bash
pnpm run gen:qqnt
```

What does it do?

1. Reads your `Library/Containers/com.tencent.qq/Data/Library/Application Support/QQ` for latest QQ vendor folder
2. Find the `global/nt_data/Emoji/emoji-resource/face_config.json` and `nt_data/Emoji/BaseEmojiSyastems/EmojiSystermResource`
3. Copy the resources to `public/assets/qq`
4. Generate the `_index.json` file

### Generate WeChat Emoji Indexes

```bash
pnpm run gen:wechat
```

### Generate 哔哩哔哩 Emoji Indexes

```bash
pnpm run gen:bilibili
```

---

## Unified Indexes

所有表情源数据都可以通过以下命令转换为统一的 `UnifiedEmojiPackage` 格式（见 `docs/types/UnifiedEmoji.ts`）。

### 输出结构

每个平台生成两类文件：

| 文件 | 说明 |
|------|------|
| `public/indexes/{name}/index.json` | 所有分组的摘要列表（id、name、coverUrl、count） |
| `public/indexes/{name}/{id}.json` | 单个分组的完整数据（含所有 emojis） |

### 生成命令

```bash
pnpm run indexes:bilibili   # → public/indexes/bilibili/
pnpm run indexes:qq         # → public/indexes/qq/
pnpm run indexes:wechat     # → public/indexes/wechat/
```

---

所有表情资源均来自腾讯官方，版权归腾讯公司所有。仅供学习交流使用，请勿用于商业用途。

本仓库代码由 Koishi 团队维护，采用 MIT 协议开源。
