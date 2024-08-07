;(async () => {
  /** @type {HTMLElement} */
  const container = document.getElementById('face-container')
  /** @type {HTMLElement} */
  const placeholder = document.getElementById('placeholder')
  /** @type {import('../lib').Face[]} */
  const list = await fetch('./lib/data.json').then((res) => res.json())

  placeholder.style.display = 'none'

  list
    .sort((a, b) => Number(a.QSid) - Number(b.QSid))
    .forEach((item) => {
      const { QSid, QDes, isStatic } = item

      const src = isStatic ? `static/s${QSid}.png` : `gif/s${QSid}.gif`
      const faceImg = document.createElement('img')
      faceImg.src = src
      faceImg.className = 'face-img'
      faceImg.loading = 'lazy'
      faceImg.onerror = function () {
        const div = document.createElement('div')
        div.className = 'face-img'
        div.textContent = '?'
        this.replaceWith(div)
      }

      const faceId = document.createElement('div')
      faceId.className = 'face-id'
      faceId.textContent = QSid

      const faceDesc = document.createElement('div')
      faceDesc.className = 'face-desc'
      faceDesc.textContent = QDes.replace(/^\//, '')

      const link = document.createElement('a')
      link.href = src
      link.target = '_blank'
      link.className = 'face'
      link.append(faceImg, faceDesc, faceId)

      Object.entries(item, ([key, val]) => {
        link.setAttribute(`data-${key}`, val)
      })

      container.append(link)
    })
})()
