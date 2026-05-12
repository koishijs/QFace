<template lang="pug">
#bilibili-view
  .hero-section
    .hero-content
      h1.hero-title BiliBili 表情库
      p.hero-subtitle 哔哩哔哩全量表情包，包含贴纸、动图等丰富资源
      .hero-stats
        .stat-item
          .stat-number {{ store.packages.length }}
          .stat-label 个分组
        .stat-item
          .stat-number {{ store.allEmojiList.length }}
          .stat-label 个表情

  .content-section
    .section-header
      h2.section-title 表情包分组
      .search-bar
        input(
          placeholder='搜索分组...'
          type='text'
          v-model='searchQuery'
        )
        .search-icon
          svg(fill='none' height='20' viewBox='0 0 24 24' width='20' xmlns='http://www.w3.org/2000/svg')
            path(d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='2')

    //- 加载中
    .empty-state(v-if='store.packages.length === 0')
      .empty-content
        KoishiPlaceholder
        p.empty-text 正在加载表情数据...

    //- 分组列表
    .packages-list(v-else-if='filteredPackages.length > 0')
      .package-card(
        :key='pkg.id'
        v-for='pkg in filteredPackages'
      )
        .package-header(@click='togglePackage(pkg.id)')
          .package-info
            img.package-cover(
              :alt='pkg.name'
              :src='pkg.cover'
              loading='lazy'
            )
            .package-meta
              .package-name {{ pkg.name }}
              .package-count {{ pkg.emojis.length }} 个表情
          .package-right
            button.copy-btn(
              :class='{ copied: copiedId === pkg.id }'
              @click.stop='copyPackageUrl(pkg.id)'
              title='复制该分组的索引 URL'
            ) {{ copiedId === pkg.id ? '✓ 已复制' : '复制配置' }}
            .package-toggle(:class='{ expanded: expandedIds.has(pkg.id) }')
            svg(fill='none' height='20' viewBox='0 0 24 24' width='20' xmlns='http://www.w3.org/2000/svg')
              path(d='M19 9l-7 7-7-7' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='2')

        .package-emojis(v-if='expandedIds.has(pkg.id)')
          .emoji-item(
            :key='item.id'
            :title='item.text'
            v-for='item in pkg.emojis'
          )
            img(
              :alt='item.text'
              :src='item.gifPath ? `/${item.gifPath}` : item.path ? `/${item.path}` : item.url'
              loading='lazy'
              @error='onImgError($event, item)'
            )
            .emoji-text {{ item.text }}

    //- 无搜索结果
    .empty-state(v-else)
      .empty-content
        .empty-icon
          svg(fill='none' height='64' viewBox='0 0 24 24' width='64' xmlns='http://www.w3.org/2000/svg')
            path(d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5')
        h3.empty-title 未找到匹配的分组
        p.empty-text 尝试使用不同的关键词搜索
</template>

<script setup lang="ts">
import type { BilibiliEmojiItem } from '@/types/BilibiliEmoji'

const store = useBilibiliEmojiStore()
const searchQuery = ref('')
const expandedIds = ref(new Set<number>())
const copiedId = ref<number | null>(null)

function copyPackageUrl(id: number) {
  const url = `${window.location.origin}/indexes/bilibili/${id}.json`
  navigator.clipboard.writeText(url).then(() => {
    copiedId.value = id
    setTimeout(() => {
      if (copiedId.value === id) copiedId.value = null
    }, 2000)
  })
}

const filteredPackages = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return store.packages
  return store.packages.filter((pkg) => pkg.name.toLowerCase().includes(q))
})

function togglePackage(id: number) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id)
  } else {
    expandedIds.value.add(id)
  }
}

function onImgError(e: Event, item: BilibiliEmojiItem) {
  const img = e.target as HTMLImageElement
  // 回退到原始 CDN URL
  if (img.src !== item.url) {
    img.src = item.url
  }
}

onMounted(() => {
  store.fetchData()
})
</script>

<style scoped lang="sass">
#bilibili-view
  min-height: 100vh
  background: var(--background-dark)

.hero-section
  padding: 80px 0 60px
  background: linear-gradient(135deg, rgba(251, 114, 153, 0.1) 0%, rgba(0, 161, 214, 0.1) 100%)
  border-bottom: 1px solid var(--border-color)

.hero-content
  max-width: 1200px
  margin: 0 auto
  padding: 0 24px
  text-align: center

.hero-title
  font-size: 48px
  font-weight: 800
  margin: 0 0 16px 0
  background: linear-gradient(135deg, #fb7299, #00a1d6)
  -webkit-background-clip: text
  -webkit-text-fill-color: transparent
  background-clip: text
  line-height: 1.2

.hero-subtitle
  font-size: 18px
  color: var(--text-secondary)
  margin: 0 0 40px 0
  max-width: 600px
  margin-left: auto
  margin-right: auto
  line-height: 1.6

.hero-stats
  display: flex
  justify-content: center
  gap: 48px
  margin-top: 40px

.stat-item
  text-align: center

.stat-number
  font-size: 32px
  font-weight: 700
  color: var(--text-primary)
  margin-bottom: 4px

.stat-label
  font-size: 14px
  color: var(--text-secondary)
  text-transform: uppercase
  letter-spacing: 1px

.content-section
  max-width: 1200px
  margin: 0 auto
  padding: 60px 24px

.section-header
  margin-bottom: 40px
  display: flex
  justify-content: space-between
  align-items: center
  flex-wrap: wrap
  gap: 20px

.section-title
  font-size: 28px
  font-weight: 700
  color: var(--text-primary)
  margin: 0

.search-bar
  position: relative
  width: 300px
  max-width: 100%

  input
    width: 100%
    padding: 12px 16px 12px 48px
    background: var(--background-card)
    border: 1px solid var(--border-color)
    border-radius: 12px
    color: var(--text-primary)
    font-size: 14px
    transition: all 0.2s ease
    box-sizing: border-box

    &:focus
      outline: none
      border-color: #fb7299
      box-shadow: 0 0 0 3px rgba(251, 114, 153, 0.1)

    &::placeholder
      color: var(--text-muted)

.search-icon
  position: absolute
  left: 16px
  top: 50%
  transform: translateY(-50%)
  color: var(--text-muted)
  pointer-events: none

// ── 分组卡片 ──────────────────────────────────────────────────
.packages-list
  display: flex
  flex-direction: column
  gap: 12px

.package-card
  background: var(--background-card)
  border: 1px solid var(--border-color)
  border-radius: 16px
  overflow: hidden
  transition: border-color 0.2s ease

  &:hover
    border-color: rgba(251, 114, 153, 0.4)

.package-header
  display: flex
  align-items: center
  justify-content: space-between
  padding: 16px 20px
  cursor: pointer
  user-select: none

  &:hover
    background: rgba(255, 255, 255, 0.03)

.package-right
  display: flex
  align-items: center
  gap: 12px
  flex-shrink: 0

.package-info
  display: flex
  align-items: center
  gap: 16px

.package-cover
  width: 48px
  height: 48px
  object-fit: contain
  border-radius: 8px
  background: rgba(255, 255, 255, 0.05)
  flex-shrink: 0

.package-meta
  display: flex
  flex-direction: column
  gap: 4px

.package-name
  font-size: 16px
  font-weight: 600
  color: var(--text-primary)

.package-count
  font-size: 13px
  color: var(--text-secondary)

.copy-btn
  padding: 6px 14px
  border-radius: 8px
  border: 1px solid var(--border-color)
  background: transparent
  color: var(--text-secondary)
  font-size: 13px
  cursor: pointer
  transition: all 0.2s ease
  white-space: nowrap
  flex-shrink: 0

  &:hover
    border-color: rgba(251, 114, 153, 0.6)
    color: #fb7299
    background: rgba(251, 114, 153, 0.08)

  &.copied
    border-color: #4ade80
    color: #4ade80
    background: rgba(74, 222, 128, 0.08)

.package-toggle
  color: var(--text-muted)
  transition: transform 0.25s ease
  flex-shrink: 0

  &.expanded
    transform: rotate(180deg)

// ── 表情网格 ─────────────────────────────────────────────────
.package-emojis
  display: grid
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr))
  gap: 8px
  padding: 16px 20px
  border-top: 1px solid var(--border-color)
  background: rgba(0, 0, 0, 0.2)

.emoji-item
  display: flex
  flex-direction: column
  align-items: center
  gap: 6px
  padding: 8px 4px
  border-radius: 10px
  cursor: default
  transition: background 0.15s ease

  &:hover
    background: rgba(255, 255, 255, 0.06)

  img
    width: 60px
    height: 60px
    object-fit: contain

.emoji-text
  font-size: 11px
  color: var(--text-secondary)
  text-align: center
  word-break: break-all
  line-height: 1.3
  max-width: 80px

// ── 空态 ────────────────────────────────────────────────────
.empty-state
  display: flex
  align-items: center
  justify-content: center
  min-height: 400px
  padding: 60px 20px

.empty-content
  text-align: center
  max-width: 400px

.empty-icon
  margin-bottom: 24px
  color: var(--text-muted)
  opacity: 0.5

.empty-title
  font-size: 24px
  font-weight: 600
  color: var(--text-primary)
  margin: 0 0 12px 0

.empty-text
  font-size: 16px
  color: var(--text-secondary)
  margin: 8px 0 0 0
  line-height: 1.6

// ── 响应式 ──────────────────────────────────────────────────
@media (max-width: 768px)
  .hero-title
    font-size: 36px

  .hero-subtitle
    font-size: 16px

  .hero-stats
    gap: 32px

  .stat-number
    font-size: 24px

  .section-header
    flex-direction: column
    align-items: stretch

  .search-bar
    width: 100%

  .content-section
    padding: 40px 16px

  .package-emojis
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr))

@media (max-width: 480px)
  .hero-stats
    flex-direction: column
    gap: 24px
</style>
