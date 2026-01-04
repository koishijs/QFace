# QQNT 表情库

探索腾讯QQ的完整表情资源，包含高清图片、APNG 和 Lottie 动画文件。

## QQNT

> 与 macOS 版同步，由仓库维护者手动同步，可能会有一些表情缺失。

- 在线预览：https://koishi.js.org/QFace/#/qqnt
- API 接口：https://koishi.js.org/QFace/assets/qq_emoji/_index.json

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

1. Reads your `Library/Containers/com.tencent.qq/Data/Library/Application Support/QQ` for latest QQ vendor folder
2. Find the `global/nt_data/Emoji/emoji-resource/face_config.json` and `nt_data/Emoji/BaseEmojiSyastems/EmojiSystermResource`
3. Copy the resources to `public/assets/qq_emoji`
4. Generate the `_index.json` file

### Generate WeChat Emoji Indexes

```bash
pnpm run gen:wechat
```

> Currently broken.

---

所有表情资源均来自腾讯官方，版权归腾讯公司所有。仅供学习交流使用，请勿用于商业用途。

本仓库代码由 Koishi 团队维护，采用 MIT 协议开源。
