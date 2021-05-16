const fs = require('fs')
const { resolve } = require('path')
const path = resolve(__dirname, './lib/data.json')
const data = JSON.parse(fs.readFileSync(path))

fs.writeFileSync(path, JSON.stringify(data.sort((a, b) => ~~a.QSid - ~~b.QSid), null, "  "))