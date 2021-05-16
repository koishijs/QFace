const data = require('./data.json')

module.exports.data = data

function get(id) {
  id = String(id)
  return data.find(el => el.QSid === id)
}

module.exports.get = get

module.exports.getUrl = (id, base = 'https://qq-face.vercel.app') => {
  const item = get(id)
  if (!item) return ''
  return base + (item.isStatic ? `/static/s${id}.png` : `/gif/s${id}.gif`)
}
