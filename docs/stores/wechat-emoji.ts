import { WechatNewEmojiItem } from '@/types/WechatNewEmoji'

export const useWechatEmojiStore = defineStore('wechat-emoji', () => {
  const allEmojiList = ref<WechatNewEmojiItem[]>([])
  const fetchData = async (noCache = false) => {
    if (!noCache && allEmojiList.value?.length) {
      return allEmojiList.value
    }
    allEmojiList.value = await fetch('assets/wechat_emoji/_index.json').then(
      (res) => res.json()
    )
    return allEmojiList.value
  }
  const sortedEmojiList = computed(() => {
    return allEmojiList.value.sort(
      (a, b) => Number(a.eggIndex) - Number(b.eggIndex)
    )
  })
  const getEmojiById = (id: number) => {
    return allEmojiList.value.find((emoji) => emoji.eggIndex === +id)
  }

  return {
    config: allEmojiList,
    fetchData,
    allEmojiList,
    sortedEmojiList,
    getEmojiById,
  }
})
