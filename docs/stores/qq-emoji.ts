import type { QqEmojiIndexV2, QqSysEmojiV2 } from '@/types/QqSysEmoji'

// Numeric ids first in numeric order, then emoji-character ids
const compareEmojiIds = (a: string, b: string) => {
  const na = Number(a)
  const nb = Number(b)
  if (isNaN(na) || isNaN(nb)) {
    return isNaN(na) && isNaN(nb) ? a.localeCompare(b) : isNaN(na) ? 1 : -1
  }
  return na - nb
}

export const useQqEmojiStore = defineStore('qq-emoji', () => {
  const emojiMap = ref<Record<string, QqSysEmojiV2>>({})
  const syncedAt = ref('')

  const fetchData = async (noCache = false) => {
    if (!noCache && syncedAt.value) {
      return emojiMap.value
    }
    const index: QqEmojiIndexV2 = await fetch(
      'assets/qq_emoji/_index.v2.json'
    ).then((res) => res.json())
    emojiMap.value = index.emojis
    syncedAt.value = index.syncedAt
    return emojiMap.value
  }

  const sortedEmojiList = computed(() =>
    Object.values(emojiMap.value).sort((a, b) =>
      compareEmojiIds(a.emojiId, b.emojiId)
    )
  )

  const getEmojiById = (id: string): QqSysEmojiV2 | undefined =>
    emojiMap.value[id]

  return {
    fetchData,
    syncedAt,
    sortedEmojiList,
    getEmojiById,
  }
})
