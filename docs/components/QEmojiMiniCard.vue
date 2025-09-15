<template lang="pug">
.qq-emoji-mini-card
  .card-inner
    .emoji-container
      .emoji-thumb
        img(:alt='value.describe || "QQ Emoji"', :src='src' loading='lazy')
        .emoji-overlay
          .view-icon
            svg(
              fill='none'
              height='20'
              viewBox='0 0 24 24'
              width='20'
              xmlns='http://www.w3.org/2000/svg'
            )
              path(
                d='M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z'
                fill='currentColor'
              )
    .card-content
      .emoji-name {{ value.describe?.replace('/', '') || `#${value.emojiId}` }}
      .emoji-id {{ `#${value.emojiId}` }}
    .card-footer
      .asset-count(v-if='assetCount > 0')
        svg(
          fill='none'
          height='14'
          viewBox='0 0 24 24'
          width='14'
          xmlns='http://www.w3.org/2000/svg'
        )
          path(
            d='M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'
            fill='currentColor'
          )
        span {{ assetCount }} 资源
        span(v-if='hasAPng') APNG
        span(v-if='hasLottie') Lottie
      .asset-count(v-else)
        span 资源暂缺
</template>

<script setup lang="ts">
import type { QqSysEmojiWithAssets } from '@/types/QqSysEmoji'

const props = defineProps<{
  value: QqSysEmojiWithAssets
}>()

const getValidThumbImage = (emoji: QqSysEmojiWithAssets) => {
  const posibleThumb = [
    QqSysEmojiAssetType.APNG,
    QqSysEmojiAssetType.THUMB_GIF,
    QqSysEmojiAssetType.THUMB_PNG,
  ]
  return posibleThumb
    .map((type) => emoji.assets.find((asset) => asset.type === type))
    .filter(Boolean)[0]
}

const src = computed(
  () => getValidThumbImage(props.value)?.path || 'assets/default.png'
)

const assetCount = computed(() => props.value.assets?.length || 0)

const hasAPng = computed(() => {
  return (
    props.value.assets?.some(
      (asset) => asset.type === QqSysEmojiAssetType.APNG
    ) || false
  )
})
const hasLottie = computed(() => {
  return (
    props.value.assets?.some(
      (asset) => asset.type === QqSysEmojiAssetType.LOTTIE_JSON
    ) || false
  )
})
</script>

<style scoped lang="sass">
.qq-emoji-mini-card
  position: relative
  width: 200px
  height: 240px
  border-radius: 16px
  overflow: hidden
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)
  cursor: pointer
  text-decoration: none
  display: block

  &:hover
    transform: translateY(-8px) scale(1.02)
    box-shadow: var(--shadow-lg)

  &:active
    transform: translateY(-4px) scale(1.01)

.card-inner
  position: relative
  width: 100%
  height: 100%
  background: var(--background-card)
  border: 1px solid var(--border-color)
  border-radius: 16px
  overflow: hidden
  display: flex
  flex-direction: column

.emoji-container
  position: relative
  flex: 1
  display: flex
  align-items: center
  justify-content: center
  padding: 20px
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)

.emoji-thumb
  position: relative
  width: 80px
  height: 80px
  border-radius: 12px
  overflow: hidden
  background: rgba(255, 255, 255, 0.05)
  display: flex
  align-items: center
  justify-content: center

  img
    width: 100%
    height: 100%
    object-fit: contain
    transition: transform 0.3s ease

.emoji-overlay
  position: absolute
  top: 0
  left: 0
  right: 0
  bottom: 0
  background: rgba(0, 0, 0, 0.7)
  display: flex
  align-items: center
  justify-content: center
  opacity: 0
  transition: opacity 0.3s ease
  user-select: none
  pointer-events: none

.view-icon
  color: white
  background: var(--primary-gradient)
  border-radius: 50%
  width: 40px
  height: 40px
  display: flex
  align-items: center
  justify-content: center

.qq-emoji-mini-card:hover .emoji-overlay
  opacity: 1

.qq-emoji-mini-card:hover .emoji-thumb img
  transform: scale(1.1)

.card-content
  padding: 16px
  flex-shrink: 0

.emoji-name
  font-size: 14px
  font-weight: 600
  color: var(--text-primary)
  margin-bottom: 4px
  line-height: 1.4
  overflow: hidden
  text-overflow: ellipsis
  white-space: nowrap

.emoji-id
  font-size: 12px
  color: var(--text-secondary)
  font-family: 'JetBrains Mono', 'Fira Code', monospace

.card-footer
  padding: 12px 16px
  border-top: 1px solid var(--border-color)
  background: rgba(0, 0, 0, 0.2)

.asset-count
  display: flex
  align-items: center
  gap: 6px
  font-size: 11px
  color: var(--text-muted)
  font-weight: 500

  svg
    opacity: 0.7

@media (max-width: 768px)
  .qq-emoji-mini-card
    width: 160px
    height: 200px

  .emoji-thumb
    width: 60px
    height: 60px

  .emoji-container
    padding: 16px

  .card-content
    padding: 12px

  .card-footer
    padding: 8px 12px
</style>
