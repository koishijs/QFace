import data from './data.json'

export { data }

export function getFaceById(id) {
  id = String(id)
  return data.find((el) => el.QSid === id)
}

export function findFaceByInput(input) {
  if (input[0] === '/') input = input.substring(1)
  const match =
    data.find((el) => el.QDes.substring(1) === input) ||
    data.find((el) => el.Input.includes(input)) ||
    data.find((el) => el.Input.some((i) => i.startsWith(input)))
  return match ? match.QSid : null
}

export function getFaceUrl(id, baseURL = 'https://koishi.js.org/QFace/') {
  const item = getFaceById(id)
  if (!item) return ''
  const url = new URL(
    item.isStatic ? `static/s${id}.png` : `gif/${id}/s${id}.gif`,
    baseURL
  )
  return url.href
}

// alias
export {
  getFaceById as get,
  findFaceByInput as getByText,
  getFaceUrl as getUrl,
}
