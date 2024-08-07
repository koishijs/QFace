import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const dataJsonPath = resolve(import.meta.dirname, '../lib/data.json')

/** @type {import('../lib').Face[]} */
const data = JSON.parse((await readFile(dataJsonPath)).toString('utf-8'))

writeFile(
  dataJsonPath,
  JSON.stringify(
    data.sort((a, b) => ~~a.QSid - ~~b.QSid),
    null,
    2
  )
)
