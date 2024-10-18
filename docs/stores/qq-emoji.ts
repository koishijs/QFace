import { QQSysEmojiConfig } from '@/types/QqSysEmoji'

export const useQqEmojiStore = defineStore('qq-emoji', () => {
  const _rawConfig = ref<QQSysEmojiConfig>()
  const fetchData = async (noCache = false) => {
    if (!noCache && _rawConfig.value) return _rawConfig.value
    _rawConfig.value = await fetch('assets/qq_emoji/default_config.json').then(
      (res) => res.json()
    )
    return _rawConfig.value
  }
  const allEmojiList = computed(() => {
    return (
      _rawConfig.value?.normalPanelResult.SysEmojiGroupList.map(
        (l) => l.SysEmojiList
      ).flat() || []
    )
  })
  const sortedEmojiList = computed(() => {
    return allEmojiList.value.sort(
      (a, b) => Number(a.emojiId) - Number(b.emojiId)
    )
  })
  const getEmojiById = (id: string) => {
    return allEmojiList.value.find((emoji) => emoji.emojiId === id)
  }
  return {
    config: _rawConfig,
    fetchData,
    allEmojiList,
    sortedEmojiList,
    getEmojiById,
  }
})
