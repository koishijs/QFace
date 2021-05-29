const data = require('./data.json')

function get(id) {
  id = String(id)
  return data.find((el) => el.QSid === id)
}

function getUrl(id, base = 'https://koishi.js.org/QFace') {
  const item = get(id)
  if (!item) return ''
  return base + (item.isStatic ? `/static/s${id}.png` : `/gif/s${id}.gif`)
}

module.exports = {
  data,
  get,
  getUrl,
}
