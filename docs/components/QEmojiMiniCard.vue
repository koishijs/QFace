<template lang="pug">
.qq-emoji-mini-card(
  bg='#161618'
  border='1px solid #7c67e6'
  color-white
  cursor='pointer'
  decoration-none
  flex-col
  inline-flex
  items-center
  justify-center
  margin='10px'
  p-4
  padding='10px'
  rounded='0.5rem'
  transition-duration-200
  w-30
)
  .face-thumb
    img(
      :alt='value.describe || "QQ Emoji"',
      :src='src'
      h-auto
      loading='lazy'
      w-full
    )
  .face-name(text-5) {{ value.describe?.replace('/', '') || `#${value.emojiId}` }}
  .face-id(text-3) {{ `#${value.emojiId}` }}
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
</script>

<style scoped lang="sass">
.qq-emoji-mini-card
  &:hover
    box-shadow: 0 0 0 0.25rem #7c67e666
</style>
