import type { BilibiliEmojiItem } from '@/types/BilibiliEmoji'

export const useBilibiliEmojiStore = defineStore('bilibili-emoji', () => {
  const allEmojiList = ref<BilibiliEmojiItem[]>([])

  const fetchData = async (noCache = false) => {
    if (!noCache && allEmojiList.value?.length) {
      return allEmojiList.value
    }
    allEmojiList.value = await fetch('/assets/bilibili_emoji/_index.json').then(
      (res) => res.json(),
    )
    return allEmojiList.value
  }

  /** 按分组聚合 */
  const packages = computed(() => {
    const map = new Map<
      number,
      { id: number; name: string; cover: string; emojis: BilibiliEmojiItem[] }
    >()
    for (const item of allEmojiList.value) {
      if (!map.has(item.packageId)) {
        map.set(item.packageId, {
          id: item.packageId,
          name: item.packageName,
          cover: item.packageCover,
          emojis: [],
        })
      }
      map.get(item.packageId)!.emojis.push(item)
    }
    return Array.from(map.values())
    // 过滤掉没有任何本地图片的分组（如颜文字纯文本包）
    .filter((pkg) => pkg.emojis.some((e) => e.path || e.gifPath))
    .map((pkg) => ({
      ...pkg,
      // 优先使用已下载到本地的封面图，避免 B 站 CDN 防盗链问题
      cover: pkg.cover.startsWith('assets/')
        ? `/${pkg.cover}`
        : (() => {
            const first = pkg.emojis[0]
            if (!first) return pkg.cover
            if (first.gifPath) return `/${first.gifPath}`
            if (first.path) return `/${first.path}`
            return pkg.cover
          })(),
    }))
  })

  return {
    allEmojiList,
    packages,
    fetchData,
  }
})
