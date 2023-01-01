# QQ 系统表情包

```js
const qface = require('qface')

qface.getUrl(178)
// 返回值：https://qq-face.vercel.app/gif/s178.gif
qface.getByText('jk')
// 返回值：26
qface.getByText('jingko')
// 返回值：26
```

## 动态图片

- 格式：`/gif/s{id}.gif`
- 实例：https://qq-face.vercel.app/gif/s178.gif

## 静态图片

- 格式：`/static/s{id}.png`
- 实例：https://qq-face.vercel.app/static/s178.png
