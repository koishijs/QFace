import {
  type QqEmojiIndexV2,
  QqSysEmojiAssetType,
  type QqSysEmojiV2,
} from '@/types/QqSysEmoji'

export const useQqEmojiStore = defineStore('qq-emoji', () => {
  const allEmojiList = ref<QqSysEmojiV2[]>([])
  const qqntVersion = ref('')
  const fetchData = async (noCache = false) => {
    if (!noCache && allEmojiList.value?.length) {
      return allEmojiList.value
    }
    const index: QqEmojiIndexV2 = await fetch(
      'assets/qq_emoji/_index.v2.json'
    ).then((res) => res.json())
    qqntVersion.value = index.qqntVersion
    allEmojiList.value = index.emojis
    return allEmojiList.value
  }
  const sortedEmojiList = computed(() => {
    return allEmojiList.value.sort(
      (a, b) => Number(a.emojiId) - Number(b.emojiId)
    )
  })
  const getEmojiById = (id: string) => {
    return allEmojiList.value.find((emoji) => emoji.emojiId === id)
  }

  const getLottieAssets = (emoji: QqSysEmojiV2) => {
    return (
      emoji.assets.filter(
        (asset) => asset.type === QqSysEmojiAssetType.LOTTIE_JSON
      ) || []
    )
  }

  return {
    config: allEmojiList,
    fetchData,
    allEmojiList,
    qqntVersion,
    sortedEmojiList,
    getEmojiById,
    getLottieAssets,
  }
})
