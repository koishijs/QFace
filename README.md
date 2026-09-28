# QQNT 表情库

探索腾讯QQ的完整表情资源，包含高清图片、APNG 和 Lottie 动画文件。

## QQNT

> 由仓库维护者手动同步。

- 在线预览：https://koishi.js.org/QFace/#/qqnt
- API 接口：https://koishi.js.org/QFace/assets/qq_emoji/_index.json
- API 接口（v2）：https://koishi.js.org/QFace/assets/qq_emoji/_index.v2.json

`_index.json` 为数组，只包含当前仍在 QQ 中的表情。已弃用，新接入不推荐，仅为下游保留。

`_index.v2.json` 以 `emojiId` 为键，包含已从 QQ 删除的表情与被替换掉的旧版资源。每个条目是 QQ 服务端返回的表情定义原样，再附加本库字段：

```ts
interface QqEmojiIndexV2 {
  syncedAt: string
  emojis: Record<
    string,
    QqSysEmojiDefinition & {
      assets: { type: 'png' | 'apng' | 'lottie' | 'interactive_res'; name: string; path: string }[]
      assetsPublishedAt?: string // 当前资源的发布时间
      removed?: true // 服务端已不再返回该表情
      history?: {
        publishedAt?: string // 这一版资源的发布时间
        replacedAt?: string // 发布时间未知时，被下一版替换的时间
        assets: { type: string; name: string; path: string }[]
      }[]
    }
  >
}
```

> [!NOTE]
> 发布时间取自资源下载地址中的时间戳。`2024-04-11T08:52:41Z` 是 QQNT 资源的统一初始上传时间，带此时间的资源实际发布不晚于这一天。

## 微信

> 不经常更新，可能会有一些表情缺失。

- 在线预览：https://koishi.js.org/QFace/#/wechat
- API 接口：https://koishi.js.org/QFace/assets/wechat_emoji/_index.json

---

## Development

### Generate QQNT Emoji Indexes

Requires Docker. Emoji definitions are looked up through a NapCat (QQNT) container in `docker/napcat`.

First time only: start the container, scan the QR code at http://localhost:6100/webui?token=qface with a secondary account, and enable auto login for it in the WebUI settings.

```bash
cd docker/napcat && docker compose up -d
```

Then:

```bash
pnpm gen:qqnt          # restart NapCat, look up every emoji id, download assets from the CDN, write both indexes
pnpm gen:qqnt --reuse  # rebuild from the last lookup (docker/napcat/data/definitions.json) without touching NapCat
pnpm test              # unit tests for the sync planner
```

Assets are downloaded into `.cache/qq-emoji-cdn`. When an emoji's assets change, the old files move to `public/assets/qq_emoji/<emojiId>/_history/<publish timestamp>/` (`before-<replacing timestamp>` when the publish time is unknown).

### Generate WeChat Emoji Indexes

```bash
pnpm run gen:wechat
```

> Currently broken.

---

所有表情资源均来自腾讯官方，版权归腾讯公司所有。仅供学习交流使用，请勿用于商业用途。

本仓库代码由 Koishi 团队维护，采用 MIT 协议开源。
