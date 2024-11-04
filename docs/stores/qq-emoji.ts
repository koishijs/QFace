import { QqSysEmojiAssetType, QqSysEmojiWithAssets } from '@/types/QqSysEmoji'

export const useQqEmojiStore = defineStore('qq-emoji', () => {
  const allEmojiList = ref<QqSysEmojiWithAssets[]>([])
  const fetchData = async (noCache = false) => {
    if (!noCache && allEmojiList.value?.length) {
      return allEmojiList.value
    }
    allEmojiList.value = await fetch(
      'assets/qq_emoji/generated_index.json'
    ).then((res) => res.json())
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

  const getLottieAssets = (emoji: QqSysEmojiWithAssets) => {
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
    sortedEmojiList,
    getEmojiById,
    getLottieAssets,
  }
})
