;(async () => {
  /** @type {HTMLElement} */
  const container = document.getElementById('face-container')
  /** @type {HTMLElement} */
  const placeholder = document.getElementById('placeholder')
  /** @type {import('../lib').Face[]} */
  const config = await fetch('./assets/default_config.json').then((res) =>
    res.json()
  )

  placeholder.style.display = 'none'

  const list = config.normalPanelResult.SysEmojiGroupList.map(
    (l) => l.SysEmojiList
  ).flat()
  list
    .sort((a, b) => Number(a.emojiId) - Number(b.emojiId))
    .forEach((item) => {
      const { emojiId, describe = '', isStatic } = item

      const src = isStatic
        ? `assets/qq_emoji/qq_emoji_${emojiId}.png`
        : `assets/resfile/emoji/${emojiId}/apng/${emojiId}.png`
      const faceImg = document.createElement('img')
      faceImg.src = src
      faceImg.className = 'face-img'
      faceImg.loading = 'lazy'
      faceImg.onerror = function () {
        const div = document.createElement('div')
        div.className = 'face-img'
        div.textContent = '?'
        div.dataset.src = src
        this.replaceWith(div)
      }

      const faceId = document.createElement('div')
      faceId.className = 'face-id'
      faceId.textContent = emojiId

      const faceDesc = document.createElement('div')
      faceDesc.className = 'face-desc'
      faceDesc.textContent = describe.replace(/^\//, '')

      const link = document.createElement('a')
      link.href = src
      link.target = '_blank'
      link.className = 'face'
      link.append(faceImg, faceDesc, faceId)

      // Object.entries(item, ([key, val]) => {
      //   link.setAttribute(`data-${key}`, val)
      // })
      link.dataset.metadata = JSON.stringify(item)

      container.append(link)
    })
  console.info('Loaded', list.length, 'faces')
})()
