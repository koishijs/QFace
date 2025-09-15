<template lang="pug">
#index-view
  .hero-section
    .hero-content
      h1.hero-title QQ Emoji 表情库
      p.hero-subtitle 探索腾讯QQ的完整表情资源，包含高清图片和动画文件
      .hero-stats
        .stat-item
          .stat-number {{ emoji.sortedEmojiList.length }}
          .stat-label 个表情
        .stat-item
          .stat-number {{ totalAssets }}
          .stat-label 个资源文件
  .content-section
    .section-header
      h2.section-title 表情列表
      .search-bar
        input(placeholder='搜索表情...' type='text' v-model='searchQuery')
        .search-icon
          svg(
            fill='none'
            height='20'
            viewBox='0 0 24 24'
            width='20'
            xmlns='http://www.w3.org/2000/svg'
          )
            path(
              d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
              stroke='currentColor'
              stroke-linecap='round'
              stroke-linejoin='round'
              stroke-width='2'
            )
    .emoji-grid(v-if='filteredEmojiList.length > 0')
      RouterLink.emoji-card-link(
        :key='item.emojiId',
        :to='`/qqnt/${item.emojiId}`'
        v-for='item in filteredEmojiList'
      )
        QEmojiMiniCard(:value='item')
    .empty-state(v-else-if='emoji.sortedEmojiList.length === 0')
      .empty-content
        KoishiPlaceholder
        p.empty-text 正在加载表情数据...
    .empty-state(v-else)
      .empty-content
        .empty-icon
          svg(
            fill='none'
            height='64'
            viewBox='0 0 24 24'
            width='64'
            xmlns='http://www.w3.org/2000/svg'
          )
            path(
              d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
              stroke='currentColor'
              stroke-linecap='round'
              stroke-linejoin='round'
              stroke-width='1.5'
            )
        h3.empty-title 未找到匹配的表情
        p.empty-text 尝试使用不同的关键词搜索
</template>

<script setup lang="ts">
const emoji = useQqEmojiStore()
const route = useRoute()
const searchQuery = ref((route.query.search as string) || '')

const filteredEmojiList = computed(() => {
  if (!searchQuery.value.trim()) {
    return emoji.sortedEmojiList
  }

  const query = searchQuery.value.toLowerCase().trim()
  return emoji.sortedEmojiList.filter((item) => {
    const describe = item.describe?.toLowerCase() || ''
    const emojiId = item.emojiId?.toLowerCase() || ''
    const associateWords = item.associateWords?.join(' ').toLowerCase() || ''

    return (
      describe.includes(query) ||
      emojiId.includes(query) ||
      associateWords.includes(query)
    )
  })
})

const totalAssets = computed(() => {
  return emoji.sortedEmojiList.reduce((total, item) => {
    return total + (item.assets?.length || 0)
  }, 0)
})

onMounted(() => {
  emoji.fetchData()
})
</script>

<style scoped lang="sass">
#index-view
  min-height: 100vh
  background: var(--background-dark)

.hero-section
  padding: 80px 0 60px
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)
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
  background: var(--primary-gradient)
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
  max-width: 1400px
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

    &:focus
      outline: none
      border-color: #667eea
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1)

    &::placeholder
      color: var(--text-muted)

.search-icon
  position: absolute
  left: 16px
  top: 50%
  transform: translateY(-50%)
  color: var(--text-muted)
  pointer-events: none

.emoji-grid
  display: grid
  grid-template-columns: repeat(auto-fit, 200px)
  gap: 24px
  margin-top: 20px
  justify-content: space-between

.emoji-card-link
  text-decoration: none
  color: inherit
  display: inline-block
  width: 200px
  height: 240px

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
  margin: 0
  line-height: 1.6

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

  .emoji-grid
    grid-template-columns: repeat(auto-fit, 160px)
    gap: 16px

  .emoji-card-link
    width: 160px
    height: 200px

  .content-section
    padding: 40px 16px

@media (max-width: 480px)
  .hero-stats
    flex-direction: column
    gap: 24px

  .emoji-grid
    grid-template-columns: repeat(auto-fit, 140px)

  .emoji-card-link
    width: 140px
    height: 180px
</style>
