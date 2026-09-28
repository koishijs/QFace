/**
 * NapCat plugin: export QQNT system emoji definitions for QFace.
 *
 * Reads /qface-data/request.json written by `pnpm gen:qqnt`, looks every id up with
 * BaseEmojiService.downloadBaseEmojiById and writes /qface-data/definitions.json.
 *
 * Use per-id lookups, not fetchFullSysEmojis: on NapCat the batch pull always answers
 * "not chage need not update source" with empty panels, even on a fresh emoji.db.
 */
import { readFile, rename, writeFile } from 'node:fs/promises'

const DATA_DIR = '/qface-data'
const REQUEST_FILE = `${DATA_DIR}/request.json`
const OUTPUT_FILE = `${DATA_DIR}/definitions.json`

// Mirrors how the client itself resolves a burst of received emojis
const BATCH_SIZE = 50
const BATCH_PAUSE_MS = 3_000
const SESSION_WARMUP_MS = 15_000
const NOT_FOUND_CODE = 11000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function lookup(service, emojiId) {
  try {
    const result = await service.downloadBaseEmojiById({
      emojiId,
      groupName: '',
      panelCategory: 0,
      qzoneCode: '',
    })
    // A non-zero result can still carry a complete definition (e.g. result 8 for 148)
    if (result?.rsp?.emojiId) {
      return { status: 'ok', definition: result.rsp }
    }
    if (result?.result === NOT_FOUND_CODE) {
      return { status: 'notFound' }
    }
    return { status: 'error', message: `${result?.result} ${result?.errMsg}` }
  } catch (error) {
    return { status: 'error', message: String(error) }
  }
}

async function lookupBatch(service, ids, results) {
  const entries = await Promise.all(
    ids.map(async (id) => [id, await lookup(service, id)])
  )
  for (const [id, entry] of entries) {
    results[id] = entry
  }
  return entries
}

async function run(ctx, request) {
  const service = ctx.core.context.session.getBaseEmojiService()
  const results = {}

  // Numeric ids: sweep past the known maximum until a whole batch finds nothing
  for (let start = 0; ; start += BATCH_SIZE) {
    const ids = Array.from({ length: BATCH_SIZE }, (_, i) => String(start + i))
    const entries = await lookupBatch(service, ids, results)
    const found = entries.some(([, entry]) => entry.status === 'ok')
    ctx.logger.info(`[qface] ids ${start}-${start + BATCH_SIZE - 1} done`)
    if (start > request.numericMax && !found) {
      break
    }
    await sleep(BATCH_PAUSE_MS)
  }

  // Emoji-character ids cannot be enumerated; the caller passes the known ones
  for (let i = 0; i < request.extraIds.length; i += BATCH_SIZE) {
    await lookupBatch(service, request.extraIds.slice(i, i + BATCH_SIZE), results)
    await sleep(BATCH_PAUSE_MS)
  }

  const output = {
    requestId: request.requestId,
    finishedAt: new Date().toISOString(),
    results,
  }
  await writeFile(`${OUTPUT_FILE}.tmp`, JSON.stringify(output, null, 2))
  await rename(`${OUTPUT_FILE}.tmp`, OUTPUT_FILE)

  const counts = Object.values(results).reduce((acc, { status }) => {
    acc[status] = (acc[status] ?? 0) + 1
    return acc
  }, {})
  ctx.logger.info(`[qface] definitions written: ${JSON.stringify(counts)}`)
}

export const plugin_init = async (ctx) => {
  let request
  try {
    request = JSON.parse(await readFile(REQUEST_FILE, 'utf-8'))
  } catch {
    ctx.logger.info('[qface] no request.json, idle')
    return
  }
  // Kernel services are not ready right after login
  await sleep(SESSION_WARMUP_MS)
  try {
    await run(ctx, request)
  } catch (error) {
    ctx.logger.error(`[qface] failed: ${error}`)
  }
}
