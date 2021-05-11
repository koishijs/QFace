const data = require('./data.json')

module.exports.data = data

module.exports.getUrl = (id, base = 'https://qq-face.vercel.app') => {
  id = String(id)
  const item = data.find(el => el.QSid === id)
  if (!item) return ''
  return base + (item.isStatic ? `/static/s${id}.png` : `/gif/s${id}.gif`)
}
