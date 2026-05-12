<template lang="pug">
#wechat-view
  .wechat-header
    h1.wechat-title All WeChat Emoji
    button.copy-btn(
      :class='{ copied }'
      @click='copyConfig'
      title='复制微信表情索引 URL'
    ) {{ copied ? '✓ 已复制' : '复制配置' }}
  .emoji-list.emoji-placeholder(v-if='emoji.sortedEmojiList.length === 0')
    .w-full.h-75vh.flex.items-center.justify-center
      KoishiPlaceholder
  .emoji-list(
    flex
    flex-wrap
    gap-4
    justify-center
    lt-md='p-x-4'
    m-x-auto
    max-w-1280px
    v-else
  )
    .emoji-item(
      :key='item.fileName',
      :title='JSON.stringify(item, null, 2)'
      v-for='item in emoji.sortedEmojiList'
    )
      img(:alt='item.cnValue || item.fileName', :src='item.path' h-30 w-30)
      .text-center {{ item.cnValue || item.fileName }}
</template>

<script setup lang="ts">
const emoji = useWechatEmojiStore()
const { copy, copied } = useClipboard()

function copyConfig() {
  copy(`${window.location.origin}/indexes/wechat/index.json`)
}

onMounted(() => {
  emoji.fetchData()
})
</script>

<style scoped lang="sass">
#wechat-view
  min-height: 100vh
  background: var(--background-dark)
  padding: 60px 24px
  max-width: 1200px
  margin: 0 auto

.wechat-header
  display: flex
  align-items: center
  justify-content: space-between
  gap: 16px
  margin-bottom: 32px

.wechat-title
  font-size: 40px
  font-weight: 700
  margin: 0

.copy-btn
  padding: 8px 16px
  border-radius: 10px
  border: 1px solid var(--border-color)
  background: transparent
  color: var(--text-secondary)
  font-size: 14px
  cursor: pointer
  transition: all 0.2s ease
  white-space: nowrap
  flex-shrink: 0

  &:hover
    border-color: rgba(7, 193, 96, 0.6)
    color: #07c160
    background: rgba(7, 193, 96, 0.08)

  &.copied
    border-color: #4ade80
    color: #4ade80
    background: rgba(74, 222, 128, 0.08)
</style>
