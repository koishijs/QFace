const data = require('./data.json')

function get(id) {
  id = String(id)
  return data.find((el) => el.QSid === id)
}

function getByText(input) {
  if (input[0] === '/') input = input.substring(1)
  const match = data.find((el) => el.QDes.substring(1) === input)
    || data.find((el) => el.Input.includes(input))
    || data.find((el) => el.Input.some((i) => i.startsWith(input)))
  return match ? match.QSid : null
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
  getByText,
}
