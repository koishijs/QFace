/**
 * Most common frame delay (ms) of an APNG, read from its fcTL chunks.
 * Returns undefined for a still PNG or an unreadable file.
 */
export function getApngFrameDelay(buffer: ArrayBuffer): number | undefined {
  const view = new DataView(buffer)
  const counts = new Map<number, number>()
  // Skip the 8-byte PNG signature, then walk length-type-data-crc chunks
  for (let offset = 8; offset + 8 <= view.byteLength; ) {
    const length = view.getUint32(offset)
    const type = String.fromCharCode(
      ...new Uint8Array(buffer, offset + 4, 4)
    )
    if (type === 'fcTL') {
      const data = offset + 8
      const numerator = view.getUint16(data + 20)
      // A zero denominator means 1/100 s per the APNG spec
      const denominator = view.getUint16(data + 22) || 100
      const delay = Math.round((numerator / denominator) * 1000)
      counts.set(delay, (counts.get(delay) ?? 0) + 1)
    }
    offset += 12 + length
  }
  let best: number | undefined
  for (const [delay, count] of counts) {
    if (best === undefined || count > counts.get(best)!) {
      best = delay
    }
  }
  return best || undefined
}
